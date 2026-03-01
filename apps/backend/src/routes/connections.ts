/**
 * Connections API Routes
 *
 * GET  /api/connections          – list connected accounts (Google, Last.fm)
 * GET  /api/connections/status   – check which providers are configured
 * POST /api/connections/import   – import data from a connected provider
 * DELETE /api/connections/:provider – disconnect (remove account row)
 */

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-utils.js";
import { createChildLogger } from "../lib/logger.js";
import { db, schema } from "../db/index.js";
import {
  getGmailItems,
  getYouTubeItems,
  getCalendarItems,
  getRecentTracks,
  getTopArtists,
  getTopTracks,
  getTopAlbums,
} from "../lib/services/connectors/index.js";
import type { ImportedItem, ConnectionInfo } from "../lib/services/connectors/types.js";
import { createNoteEntry } from "../lib/services/notes.js";
import { createBookmarkAndQueueJob } from "../lib/services/bookmarks.js";
import type { RouteVariables } from "../types/route-variables.js";

const logger = createChildLogger("connections");

export const connectionsRoutes = new Hono<{ Variables: RouteVariables }>();

// -----------------------------------------------------------------------
// GET /api/connections/status – which providers are server-side configured?
// -----------------------------------------------------------------------
connectionsRoutes.get("/status", async (c) => {
  return c.json({
    providers: {
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      lastfm: !!(process.env.LASTFM_API_KEY && process.env.LASTFM_USERNAME),
    },
  });
});

// -----------------------------------------------------------------------
// GET /api/connections – list the user's connected accounts
// -----------------------------------------------------------------------
connectionsRoutes.get("/", async (c) => {
  try {
    const userId = await requireAuth(c);

    const accounts = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, userId));

    // Filter to only oauth accounts (not the email/password "credential" provider)
    const connections: ConnectionInfo[] = accounts
      .filter((a) => a.providerId !== "credential")
      .map((a) => ({
        provider: a.providerId as "google" | "lastfm",
        accountId: a.accountId,
        connectedAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
        availableServices:
          a.providerId === "google"
            ? ["gmail", "youtube", "calendar"]
            : ["recent-tracks", "top-tracks", "top-artists", "top-albums"],
      }));

    return c.json({ connections });
  } catch (err) {
    logger.error({ err }, "Failed to list connections");
    return c.json({ error: "Failed to list connections" }, 500);
  }
});

// -----------------------------------------------------------------------
// DELETE /api/connections/:provider – disconnect / unlink an account
// -----------------------------------------------------------------------
connectionsRoutes.delete("/:provider", async (c) => {
  try {
    const userId = await requireAuth(c);
    const provider = c.req.param("provider");

    if (!["google", "lastfm"].includes(provider)) {
      return c.json({ error: "Invalid provider" }, 400);
    }

    await db
      .delete(schema.accounts)
      .where(
        and(
          eq(schema.accounts.userId, userId),
          eq(schema.accounts.providerId, provider),
        ),
      );

    logger.info({ userId, provider }, "Disconnected provider");
    return c.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to disconnect provider");
    return c.json({ error: "Failed to disconnect" }, 500);
  }
});

// -----------------------------------------------------------------------
// POST /api/connections/import – import items from a service
// body: { provider: "google"|"lastfm", service: string, maxResults?: number }
// -----------------------------------------------------------------------
connectionsRoutes.post("/import", async (c) => {
  try {
    const userId = await requireAuth(c);
    const body = await c.req.json<{
      provider: string;
      service: string;
      maxResults?: number;
    }>();

    const { provider, service, maxResults = 25 } = body;

    // Last.fm uses API key auth (no per-user OAuth token needed)
    let accessToken = "";
    if (provider !== "lastfm") {
      // Look up the account row to get the access token
      const [account] = await db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.userId, userId),
            eq(schema.accounts.providerId, provider),
          ),
        );

      if (!account || !account.accessToken) {
        return c.json(
          { error: `No ${provider} account connected or no access token available` },
          400,
        );
      }

      accessToken = account.accessToken;
    }

    // Fetch items from the external service
    let items: ImportedItem[] = [];
    try {
      switch (`${provider}:${service}`) {
        case "google:gmail":
          items = await getGmailItems(accessToken, maxResults);
          break;
        case "google:youtube":
          items = await getYouTubeItems(accessToken, maxResults);
          break;
        case "google:calendar":
          items = await getCalendarItems(accessToken, maxResults);
          break;
        case "lastfm:recent-tracks":
          items = await getRecentTracks(undefined, maxResults);
          break;
        case "lastfm:top-tracks":
          items = await getTopTracks(undefined, maxResults);
          break;
        case "lastfm:top-artists":
          items = await getTopArtists(undefined, maxResults);
          break;
        case "lastfm:top-albums":
          items = await getTopAlbums(undefined, maxResults);
          break;
        default:
          return c.json(
            { error: `Unknown service: ${provider}:${service}` },
            400,
          );
      }
    } catch (fetchErr) {
      logger.error({ fetchErr, provider, service }, "Failed to fetch from external service");
      return c.json(
        {
          error: `Failed to fetch from ${provider}/${service}. The access token may have expired – try reconnecting.`,
        },
        502,
      );
    }

    // Persist each imported item into the appropriate Cortex entity
    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        if (item.type === "note" || item.type === "task") {
          await createNoteEntry(
            {
              content: item.content,
              metadata: {
                title: item.title,
                tags: item.tags,
                ...(item.metadata ?? {}),
                importedFrom: `${provider}/${service}`,
                sourceUrl: item.sourceUrl,
              },
              originalMimeType: "text/markdown",
              userAgent: "cortex-connector",
            },
            userId,
          );
          imported++;
        } else if (item.type === "bookmark" && item.sourceUrl) {
          await createBookmarkAndQueueJob({
            url: item.sourceUrl,
            userId,
            rawMetadata: {
              title: item.title,
              description: item.content,
              tags: item.tags,
              ...(item.metadata ?? {}),
              importedFrom: `${provider}/${service}`,
            },
            userAgent: "cortex-connector",
          });
          imported++;
        }
      } catch (persistErr) {
        const msg = `Failed to persist "${item.title}": ${persistErr instanceof Error ? persistErr.message : String(persistErr)}`;
        errors.push(msg);
        logger.warn({ persistErr, title: item.title }, msg);
      }
    }

    logger.info(
      { provider, service, fetched: items.length, imported, errors: errors.length },
      "Import complete",
    );

    return c.json({
      provider,
      service,
      fetched: items.length,
      imported,
      skipped: items.length - imported - errors.length,
      errors,
    });
  } catch (err) {
    logger.error({ err }, "Import failed");
    return c.json({ error: "Import failed" }, 500);
  }
});
