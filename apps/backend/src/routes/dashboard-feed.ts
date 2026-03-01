/**
 * Dashboard Feed API Routes
 *
 * GET  /api/dashboard/feeds        — fetch all feed data (news, finance, music, youtube)
 * GET  /api/dashboard/feeds/:type  — fetch a single feed type
 *
 * All feeds use a two-tier cache (memory + database) for instant loads.
 */

import { Hono } from "hono";
import { getAuthenticatedUserId } from "../lib/auth-utils.js";
import { createChildLogger } from "../lib/logger.js";
import { getNews } from "../lib/services/dashboard/news-service.js";
import { getFinance } from "../lib/services/dashboard/finance-service.js";
import { getMusic } from "../lib/services/dashboard/music-service.js";
import { getYouTube } from "../lib/services/dashboard/youtube-service.js";
import {
  getCachedFinance,
  getCachedNews,
  getCachedMusic,
  getCachedYouTube,
  getCacheStats,
} from "../lib/services/dashboard/cache-service.js";
import type { RouteVariables } from "../types/route-variables.js";

const logger = createChildLogger("dashboard-feed");

export const dashboardFeedRoutes = new Hono<{ Variables: RouteVariables }>();

// -----------------------------------------------------------------------
// GET /api/dashboard/feeds — all feeds in parallel (cached)
// -----------------------------------------------------------------------
dashboardFeedRoutes.get("/feeds", async (c) => {
  try {
    const userId: string = (await getAuthenticatedUserId(c)) ?? "";

    const [newsResult, financeResult, musicResult, youtubeResult] =
      await Promise.allSettled([
        getCachedNews(() => getNews()),
        getCachedFinance(() => getFinance()),
        getCachedMusic(() => getMusic(userId)),
        getCachedYouTube(() => getYouTube(userId)),
      ]);

    return c.json({
      news:
        newsResult.status === "fulfilled" ? newsResult.value : [],
      finance:
        financeResult.status === "fulfilled" ? financeResult.value : [],
      music:
        musicResult.status === "fulfilled" ? musicResult.value : [],
      youtube:
        youtubeResult.status === "fulfilled" ? youtubeResult.value : [],
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch dashboard feeds");
    return c.json({ news: [], finance: [], music: [], youtube: [] }, 500);
  }
});

// -----------------------------------------------------------------------
// GET /api/dashboard/feeds/:type — single feed type (cached)
// -----------------------------------------------------------------------
dashboardFeedRoutes.get("/feeds/:type", async (c) => {
  try {
    const userId: string = (await getAuthenticatedUserId(c)) ?? "";
    const feedType = c.req.param("type");

    switch (feedType) {
      case "news":
        return c.json({ news: await getCachedNews(() => getNews()) });
      case "finance":
        return c.json({ finance: await getCachedFinance(() => getFinance()) });
      case "music":
        return c.json({ music: await getCachedMusic(() => getMusic(userId)) });
      case "youtube":
        return c.json({ youtube: await getCachedYouTube(() => getYouTube(userId)) });
      case "stats":
        // Debug endpoint to check cache status
        return c.json({ cacheStats: getCacheStats() });
      default:
        return c.json({ error: `Unknown feed type: ${feedType}` }, 400);
    }
  } catch (err) {
    logger.error({ err }, "Failed to fetch individual feed");
    return c.json({ error: "Failed to fetch feed" }, 500);
  }
});
