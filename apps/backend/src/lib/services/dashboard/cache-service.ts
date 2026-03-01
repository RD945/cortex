/**
 * Dashboard Feed Cache Service
 *
 * Implements a two-tier caching strategy:
 * 1. In-memory cache (fast, process-local)
 * 2. Database cache (persistent across restarts/devices)
 *
 * This ensures dashboard loads are instant even after server restart
 * or when logging in from a different device.
 */

import { eq, gt } from "drizzle-orm";
import { db, schema } from "../../../db/index.js";
import { createChildLogger } from "../../logger.js";
import type { FinanceItem, MusicItem, NewsItem, YouTubeItem } from "./types.js";

const logger = createChildLogger("dashboard:cache");

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeedType = "finance" | "news" | "music" | "youtube";

export interface CacheEntry<T> {
  data: T;
  updatedAt: Date;
  expiresAt: Date;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/** TTL in milliseconds per feed type */
const CACHE_TTL: Record<FeedType, number> = {
  finance: 5 * 60 * 1000,    // 5 minutes (prices change frequently)
  news: 15 * 60 * 1000,      // 15 minutes
  music: 10 * 60 * 1000,     // 10 minutes
  youtube: 30 * 60 * 1000,   // 30 minutes
};

// ─── In-Memory Cache ─────────────────────────────────────────────────────────

const memoryCache = new Map<FeedType, CacheEntry<unknown>>();

function getFromMemory<T>(feedType: FeedType): T | null {
  const entry = memoryCache.get(feedType) as CacheEntry<T> | undefined;
  if (!entry) return null;

  // Check if expired
  if (Date.now() > entry.expiresAt.getTime()) {
    memoryCache.delete(feedType);
    return null;
  }

  logger.debug({ feedType }, "Memory cache hit");
  return entry.data;
}

function setInMemory<T>(feedType: FeedType, data: T): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL[feedType]);
  
  memoryCache.set(feedType, {
    data,
    updatedAt: now,
    expiresAt,
  });
  
  logger.debug({ feedType, expiresAt }, "Updated memory cache");
}

// ─── Database Cache ──────────────────────────────────────────────────────────

const { dashboardCache } = schema;

async function getFromDatabase<T>(feedType: FeedType): Promise<T | null> {
  try {
    const result = await db
      .select()
      .from(dashboardCache)
      .where(eq(dashboardCache.feedType, feedType))
      .limit(1);

    if (result.length === 0) return null;

    const entry = result[0];
    const now = new Date();

    // Check if expired
    if (now > entry.expiresAt) {
      logger.debug({ feedType }, "Database cache expired");
      return null;
    }

    const data = JSON.parse(entry.data) as T;
    
    // Populate memory cache with fresh database data
    setInMemory(feedType, data);
    
    logger.debug({ feedType }, "Database cache hit");
    return data;
  } catch (err) {
    logger.warn({ err, feedType }, "Failed to read from database cache");
    return null;
  }
}

async function setInDatabase<T>(feedType: FeedType, data: T): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL[feedType]);
    const jsonData = JSON.stringify(data);

    // Upsert: insert or update on conflict
    await db
      .insert(dashboardCache)
      .values({
        feedType,
        data: jsonData,
        updatedAt: now,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: dashboardCache.feedType,
        set: {
          data: jsonData,
          updatedAt: now,
          expiresAt,
        },
      });

    logger.debug({ feedType, expiresAt }, "Updated database cache");
  } catch (err) {
    logger.warn({ err, feedType }, "Failed to write to database cache");
    // Non-fatal: memory cache still works
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get cached data or fetch fresh data using the provided fetcher function.
 *
 * Lookup order:
 * 1. Memory cache (instant)
 * 2. Database cache (fast, survives restarts)
 * 3. Live fetch (slow, updates both caches)
 */
export async function getCachedOrFetch<T>(
  feedType: FeedType,
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1. Try memory cache
  const memoryData = getFromMemory<T>(feedType);
  if (memoryData !== null) {
    return memoryData;
  }

  // 2. Try database cache
  const dbData = await getFromDatabase<T>(feedType);
  if (dbData !== null) {
    return dbData;
  }

  // 3. Fetch fresh data
  logger.debug({ feedType }, "Cache miss, fetching fresh data");
  const freshData = await fetcher();

  // Update both caches (async, don't await database write for speed)
  setInMemory(feedType, freshData);
  setInDatabase(feedType, freshData).catch(() => {
    // Error already logged in setInDatabase
  });

  return freshData;
}

/**
 * Force refresh a specific feed type.
 * Useful for manual cache invalidation.
 */
export async function refreshCache<T>(
  feedType: FeedType,
  fetcher: () => Promise<T>,
): Promise<T> {
  logger.info({ feedType }, "Force refreshing cache");
  
  const freshData = await fetcher();
  
  setInMemory(feedType, freshData);
  await setInDatabase(feedType, freshData);
  
  return freshData;
}

/**
 * Clear all cached data (for testing or reset).
 */
export async function clearAllCaches(): Promise<void> {
  // Clear memory
  memoryCache.clear();
  
  // Clear database
  try {
    await db.delete(dashboardCache);
    logger.info("Cleared all dashboard caches");
  } catch (err) {
    logger.warn({ err }, "Failed to clear database cache");
  }
}

/**
 * Get cache stats for monitoring/debugging.
 */
export function getCacheStats(): Record<FeedType, { cached: boolean; expiresAt?: Date }> {
  const stats: Record<FeedType, { cached: boolean; expiresAt?: Date }> = {
    finance: { cached: false },
    news: { cached: false },
    music: { cached: false },
    youtube: { cached: false },
  };

  for (const [feedType, entry] of memoryCache.entries()) {
    const typedEntry = entry as CacheEntry<unknown>;
    if (Date.now() < typedEntry.expiresAt.getTime()) {
      stats[feedType] = {
        cached: true,
        expiresAt: typedEntry.expiresAt,
      };
    }
  }

  return stats;
}

// ─── Type-safe wrappers ──────────────────────────────────────────────────────

export async function getCachedFinance(
  fetcher: () => Promise<FinanceItem[]>,
): Promise<FinanceItem[]> {
  return getCachedOrFetch("finance", fetcher);
}

export async function getCachedNews(
  fetcher: () => Promise<NewsItem[]>,
): Promise<NewsItem[]> {
  return getCachedOrFetch("news", fetcher);
}

export async function getCachedMusic(
  fetcher: () => Promise<MusicItem[]>,
): Promise<MusicItem[]> {
  return getCachedOrFetch("music", fetcher);
}

export async function getCachedYouTube(
  fetcher: () => Promise<YouTubeItem[]>,
): Promise<YouTubeItem[]> {
  return getCachedOrFetch("youtube", fetcher);
}
