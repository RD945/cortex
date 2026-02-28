/**
 * Admin routes for Cortex
 * Protected administrative operations
 */

import { Hono } from "hono";
import { getAuthenticatedUserId } from "../lib/auth-utils.js";
import { createChildLogger } from "../lib/logger.js";
import { getQueueAdapter } from "../lib/queue/index.js";
import type { RouteVariables } from "../types/route-variables.js";

const logger = createChildLogger("admin");

export const adminRoutes = new Hono<{ Variables: RouteVariables }>();

/**
 * POST /api/admin/graphiti/ingest
 *
 * Trigger bulk ingest of existing content into Graphiti knowledge graph.
 * Ingests: past conversations, notes, bookmarks, documents.
 *
 * Request body:
 * - includeMessages: boolean (default: true) - include past conversations
 * - includeNotes: boolean (default: true) - include notes
 * - includeBookmarks: boolean (default: true) - include bookmarks
 * - includeDocuments: boolean (default: true) - include documents
 */
adminRoutes.post("/graphiti/ingest", async (c) => {
  try {
    const userId = await getAuthenticatedUserId(c);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Parse request body
    let body: Record<string, unknown> = {};
    try {
      body = await c.req.json();
    } catch {
      // Empty body is fine, use defaults
    }

    const includeMessages = body.includeMessages !== false;
    const includeNotes = body.includeNotes !== false;
    const includeBookmarks = body.includeBookmarks !== false;
    const includeDocuments = body.includeDocuments !== false;

    logger.info(
      { userId, includeMessages, includeNotes, includeBookmarks, includeDocuments },
      "Triggering Graphiti bulk ingest",
    );

    // Get queue adapter and enqueue the job
    const queueAdapter = await getQueueAdapter();
    await queueAdapter.enqueueGraphitiIngest({
      userId,
      includeMessages,
      includeNotes,
      includeBookmarks,
      includeDocuments,
    });

    return c.json({
      success: true,
      message: "Graphiti bulk ingest job queued",
      options: {
        includeMessages,
        includeNotes,
        includeBookmarks,
        includeDocuments,
      },
    });
  } catch (error) {
    const requestId = c.get("requestId");
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to enqueue Graphiti bulk ingest",
    );
    return c.json(
      { error: "Failed to enqueue Graphiti bulk ingest" },
      500,
    );
  }
});
