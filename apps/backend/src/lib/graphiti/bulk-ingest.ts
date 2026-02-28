/**
 * Graphiti Bulk Ingest Service
 *
 * On-demand service to bulk ingest existing content (notes, bookmarks, documents)
 * into the Graphiti knowledge graph for a user.
 *
 * Called via admin API: POST /api/admin/graphiti/ingest/:userId
 */

import { and, eq, gt, isNotNull, sql, desc } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { graphitiClient, type GraphitiMessage } from "../graphiti/index.js";
import { createChildLogger } from "../logger.js";
import { getStorage } from "../storage/index.js";

const logger = createChildLogger("graphiti-ingest");

const { notes, bookmarks, documents } = schema;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BulkIngestOptions {
  /** User ID to ingest content for */
  userId: string;
  /** Skip items ingested after this date (for incremental ingestion) */
  sinceDate?: Date;
  /** Max items per content type (default: 500) */
  batchSize?: number;
  /** Content types to ingest */
  contentTypes?: Array<"notes" | "bookmarks" | "documents">;
}

export interface BulkIngestResult {
  notes: { processed: number; errors: number };
  bookmarks: { processed: number; errors: number };
  documents: { processed: number; errors: number };
  duration: number;
}

// ─── Batch Processing ────────────────────────────────────────────────────────

/**
 * Batch messages into smaller chunks for API calls
 */
function batchMessages<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

// ─── Notes Ingestion ─────────────────────────────────────────────────────────

async function ingestNotes(
  userId: string,
  sinceDate?: Date,
  limit = 500,
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Query notes with content
    const conditions = [
      eq(notes.userId, userId),
      isNotNull(notes.content),
    ];
    
    if (sinceDate) {
      conditions.push(gt(notes.updatedAt, sinceDate));
    }

    const userNotes = await db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.updatedAt))
      .limit(limit);

    if (userNotes.length === 0) {
      logger.debug({ userId }, "No notes to ingest");
      return { processed: 0, errors: 0 };
    }

    // Convert notes to Graphiti messages
    const messages: GraphitiMessage[] = userNotes
      .filter((note) => note.content && note.content.trim().length > 0)
      .map((note) => ({
        role_type: "user" as const,
        content: `[Note: ${note.title || "Untitled"}]\n\n${note.content}`,
        source_description: `cortex note ${note.id}`,
        timestamp: note.updatedAt?.toISOString() ?? note.createdAt?.toISOString(),
      }));

    // Batch and send
    const batches = batchMessages(messages, 10);
    for (const batch of batches) {
      try {
        await graphitiClient.addMessages(userId, batch);
        processed += batch.length;
        // Small delay between batches to avoid overwhelming the service
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        logger.warn({ err, userId, batchSize: batch.length }, "Failed to ingest note batch");
        errors += batch.length;
      }
    }

    logger.info({ userId, processed, errors, total: userNotes.length }, "Notes ingestion complete");
  } catch (err) {
    logger.error({ err, userId }, "Notes ingestion failed");
    throw err;
  }

  return { processed, errors };
}

// ─── Bookmarks Ingestion ─────────────────────────────────────────────────────

async function ingestBookmarks(
  userId: string,
  sinceDate?: Date,
  limit = 500,
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Query bookmarks with extracted content
    const conditions = [
      eq(bookmarks.userId, userId),
      isNotNull(bookmarks.title),
    ];

    if (sinceDate) {
      conditions.push(gt(bookmarks.updatedAt, sinceDate));
    }

    const userBookmarks = await db
      .select({
        id: bookmarks.id,
        originalUrl: bookmarks.originalUrl,
        title: bookmarks.title,
        description: bookmarks.description,
        extractedText: bookmarks.extractedText,
        createdAt: bookmarks.createdAt,
        updatedAt: bookmarks.updatedAt,
      })
      .from(bookmarks)
      .where(and(...conditions))
      .orderBy(desc(bookmarks.updatedAt))
      .limit(limit);

    if (userBookmarks.length === 0) {
      logger.debug({ userId }, "No bookmarks to ingest");
      return { processed: 0, errors: 0 };
    }

    // Convert bookmarks to Graphiti messages
    const messages: GraphitiMessage[] = userBookmarks
      .filter((bm) => bm.title || bm.description || bm.extractedText)
      .map((bm) => {
        const parts = [`[Bookmark: ${bm.title || bm.originalUrl}]`, `URL: ${bm.originalUrl}`];
        if (bm.description) parts.push(`Description: ${bm.description}`);
        if (bm.extractedText) {
          // Truncate long content
          const content = bm.extractedText.slice(0, 2000);
          parts.push(`Content:\n${content}`);
        }

        return {
          role_type: "user" as const,
          content: parts.join("\n\n"),
          source_description: `cortex bookmark ${bm.id}`,
          timestamp: bm.updatedAt?.toISOString() ?? bm.createdAt?.toISOString(),
        };
      });

    // Batch and send
    const batches = batchMessages(messages, 10);
    for (const batch of batches) {
      try {
        await graphitiClient.addMessages(userId, batch);
        processed += batch.length;
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        logger.warn({ err, userId, batchSize: batch.length }, "Failed to ingest bookmark batch");
        errors += batch.length;
      }
    }

    logger.info({ userId, processed, errors, total: userBookmarks.length }, "Bookmarks ingestion complete");
  } catch (err) {
    logger.error({ err, userId }, "Bookmarks ingestion failed");
    throw err;
  }

  return { processed, errors };
}

// ─── Documents Ingestion ─────────────────────────────────────────────────────

async function ingestDocuments(
  userId: string,
  sinceDate?: Date,
  limit = 500,
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const storage = getStorage();

    // Query processed documents (those with extracted text)
    const conditions = [
      eq(documents.userId, userId),
      isNotNull(documents.extractedTxtStorageId),
    ];

    if (sinceDate) {
      conditions.push(gt(documents.updatedAt, sinceDate));
    }

    const userDocs = await db
      .select({
        id: documents.id,
        originalFilename: documents.originalFilename,
        title: documents.title,
        description: documents.description,
        extractedTxtStorageId: documents.extractedTxtStorageId,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.updatedAt))
      .limit(limit);

    if (userDocs.length === 0) {
      logger.debug({ userId }, "No documents to ingest");
      return { processed: 0, errors: 0 };
    }

    // Process each document individually (need to read storage)
    for (const doc of userDocs) {
      try {
        let extractedText = "";

        // Try to read extracted text from storage
        if (doc.extractedTxtStorageId) {
          try {
            const { buffer } = await storage.readBuffer(doc.extractedTxtStorageId);
            extractedText = buffer.toString("utf-8").slice(0, 4000); // Truncate
          } catch {
            // Storage read failed, use description instead
          }
        }

        // Build content
        const parts = [`[Document: ${doc.title || doc.originalFilename}]`];
        if (doc.description) parts.push(`Description: ${doc.description}`);
        if (extractedText) parts.push(`Content:\n${extractedText}`);

        // Skip if no meaningful content
        if (parts.length === 1 && !doc.description) {
          continue;
        }

        await graphitiClient.addMessages(userId, [
          {
            role_type: "user" as const,
            content: parts.join("\n\n"),
            source_description: `cortex document ${doc.id}`,
            timestamp: doc.updatedAt?.toISOString() ?? doc.createdAt?.toISOString(),
          },
        ]);
        processed++;
        await new Promise((r) => setTimeout(r, 50));
      } catch (err) {
        logger.warn({ err, userId, docId: doc.id }, "Failed to ingest document");
        errors++;
      }
    }

    logger.info({ userId, processed, errors, total: userDocs.length }, "Documents ingestion complete");
  } catch (err) {
    logger.error({ err, userId }, "Documents ingestion failed");
    throw err;
  }

  return { processed, errors };
}

// ─── Main Bulk Ingest Function ───────────────────────────────────────────────

/**
 * Bulk ingest existing content for a user into the Graphiti knowledge graph.
 *
 * @example
 * ```typescript
 * const result = await bulkIngestForUser({
 *   userId: "user_123",
 *   contentTypes: ["notes", "bookmarks"],
 *   batchSize: 100,
 * });
 * console.log(result); // { notes: { processed: 50, errors: 0 }, ... }
 * ```
 */
export async function bulkIngestForUser(
  options: BulkIngestOptions,
): Promise<BulkIngestResult> {
  const {
    userId,
    sinceDate,
    batchSize = 500,
    contentTypes = ["notes", "bookmarks", "documents"],
  } = options;

  const startTime = Date.now();

  logger.info({ userId, contentTypes, batchSize, sinceDate }, "Starting bulk ingest");

  const result: BulkIngestResult = {
    notes: { processed: 0, errors: 0 },
    bookmarks: { processed: 0, errors: 0 },
    documents: { processed: 0, errors: 0 },
    duration: 0,
  };

  // Process each content type
  if (contentTypes.includes("notes")) {
    result.notes = await ingestNotes(userId, sinceDate, batchSize);
  }

  if (contentTypes.includes("bookmarks")) {
    result.bookmarks = await ingestBookmarks(userId, sinceDate, batchSize);
  }

  if (contentTypes.includes("documents")) {
    result.documents = await ingestDocuments(userId, sinceDate, batchSize);
  }

  result.duration = Date.now() - startTime;

  logger.info(
    {
      userId,
      duration: result.duration,
      notes: result.notes,
      bookmarks: result.bookmarks,
      documents: result.documents,
    },
    "Bulk ingest complete",
  );

  return result;
}
