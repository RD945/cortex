/**
 * Graphiti Bulk Ingest Processor
 *
 * Background job to bulk ingest existing content into the Graphiti knowledge graph.
 * Ingests: past conversation messages, notes, bookmarks, documents.
 */

import { eq, asc } from "drizzle-orm";
import type { JobContext } from "@cortex/queue/core";
import { db, schema } from "../../db/index.js";
import { graphitiClient, type GraphitiMessage } from "../../lib/graphiti/index.js";
import { bulkIngestForUser } from "../../lib/graphiti/bulk-ingest.js";
import { createChildLogger } from "../../lib/logger.js";

const logger = createChildLogger("graphiti-ingest-processor");

const { conversations, messages } = schema;

const BATCH_SIZE = 10; // Small batches to avoid overwhelming Graphiti

export interface GraphitiIngestJobData {
  userId: string;
  includeMessages: boolean;
  includeNotes: boolean;
  includeBookmarks: boolean;
  includeDocuments: boolean;
}

/**
 * Ingest past conversation messages into Graphiti
 */
async function ingestMessages(
  userId: string,
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Get all conversations for this user
    const userConversations = await db
      .select({ id: conversations.id, title: conversations.title })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    if (userConversations.length === 0) {
      logger.debug({ userId }, "No conversations to ingest");
      return { processed: 0, errors: 0 };
    }

    logger.info(
      { userId, conversationCount: userConversations.length },
      "Starting messages ingestion",
    );

    for (const conv of userConversations) {
      try {
        // Fetch messages in this conversation ordered by time
        const msgs = await db
          .select({
            id: messages.id,
            role: messages.role,
            content: messages.content,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(asc(messages.createdAt));

        if (msgs.length === 0) continue;

        // Convert to Graphiti messages
        const graphitiMessages: GraphitiMessage[] = msgs
          .filter((m) => m.content && m.content.trim().length > 0)
          .map((m) => ({
            role_type: m.role as "user" | "assistant",
            content: m.content,
            source_description: `cortex conversation: ${conv.title || conv.id}`,
            timestamp: m.createdAt?.toISOString(),
          }));

        // Send in batches to avoid overwhelming Graphiti
        for (let i = 0; i < graphitiMessages.length; i += BATCH_SIZE) {
          const batch = graphitiMessages.slice(i, i + BATCH_SIZE);
          try {
            await graphitiClient.addMessages(userId, batch);
            processed += batch.length;
            // Small delay between batches
            await new Promise((r) => setTimeout(r, 100));
          } catch (err) {
            logger.warn(
              { err, userId, conversationId: conv.id, batchSize: batch.length },
              "Failed to ingest message batch",
            );
            errors += batch.length;
          }
        }
      } catch (err) {
        logger.warn(
          { err, userId, conversationId: conv.id },
          "Failed to process conversation",
        );
        errors++;
      }
    }

    logger.info(
      { userId, processed, errors },
      "Messages ingestion complete",
    );
  } catch (err) {
    logger.error({ err, userId }, "Messages ingestion failed");
    throw err;
  }

  return { processed, errors };
}

/**
 * Process Graphiti bulk ingest job
 */
export async function processGraphitiIngest(
  ctx: JobContext<GraphitiIngestJobData>,
): Promise<void> {
  const {
    userId,
    includeMessages,
    includeNotes,
    includeBookmarks,
    includeDocuments,
  } = ctx.job.data;

  const startTime = Date.now();
  const results: Record<string, { processed: number; errors: number }> = {};

  logger.info(
    {
      userId,
      includeMessages,
      includeNotes,
      includeBookmarks,
      includeDocuments,
    },
    "Starting Graphiti bulk ingest job",
  );

  // Stage 1: Messages (past conversations)
  if (includeMessages) {
    logger.info({ userId }, "Ingesting messages...");
    results.messages = await ingestMessages(userId);
  }

  // Stage 2-4: Notes, Bookmarks, Documents (use existing bulk ingest service)
  const contentTypes: Array<"notes" | "bookmarks" | "documents"> = [];
  if (includeNotes) contentTypes.push("notes");
  if (includeBookmarks) contentTypes.push("bookmarks");
  if (includeDocuments) contentTypes.push("documents");

  if (contentTypes.length > 0) {
    logger.info({ userId, contentTypes }, "Ingesting content...");
    const bulkResult = await bulkIngestForUser({
      userId,
      contentTypes,
      batchSize: 500,
    });

    if (includeNotes) results.notes = bulkResult.notes;
    if (includeBookmarks) results.bookmarks = bulkResult.bookmarks;
    if (includeDocuments) results.documents = bulkResult.documents;
  }

  const duration = Date.now() - startTime;

  logger.info(
    {
      userId,
      duration,
      results,
    },
    "Graphiti bulk ingest job complete",
  );
}

export default processGraphitiIngest;
