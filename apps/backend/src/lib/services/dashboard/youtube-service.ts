/**
 * YouTube Service
 *
 * Returns user's liked YouTube videos when Google is connected,
 * otherwise returns realistic demo data.
 */

import { eq, and } from "drizzle-orm";
import { db, schema } from "../../../db/index.js";
import { createChildLogger } from "../../logger.js";
import { getYouTubeItems } from "../connectors/google-connector.js";
import type { YouTubeItem } from "./types.js";
import type { ImportedItem } from "../connectors/types.js";

const logger = createChildLogger("dashboard:youtube");

// ---------------------------------------------------------------------------
// Live — pull from connected Google account
// ---------------------------------------------------------------------------
async function getYouTubeLive(userId: string): Promise<YouTubeItem[] | null> {
  try {
    const [account] = await db
      .select()
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.userId, userId),
          eq(schema.accounts.providerId, "google"),
        ),
      );

    if (!account?.accessToken) return null;

    const items: ImportedItem[] = await getYouTubeItems(account.accessToken, 6);

    return items.map((item) => ({
      title: item.title,
      channelName:
        (item.metadata?.channelTitle as string) ?? "YouTube",
      thumbnailUrl: item.metadata?.thumbnailUrl as string | undefined,
      sourceUrl: item.sourceUrl ?? "https://youtube.com",
      publishedAt: item.sourceDate,
    }));
  } catch (err) {
    logger.warn({ err }, "Failed to fetch live YouTube data");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function getYouTubeDemo(): YouTubeItem[] {
  return [
    {
      title: "God-Tier Developer Roadmap 2026",
      channelName: "Fireship",
      viewCount: "2.1M views",
      thumbnailUrl: "https://i.ytimg.com/vi/pEfrdAtAmqk/hqdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=pEfrdAtAmqk",
      publishedAt: daysAgoISO(1),
    },
    {
      title: "But what is a neural network? | Deep learning chapter 1",
      channelName: "3Blue1Brown",
      viewCount: "18M views",
      thumbnailUrl: "https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
      publishedAt: daysAgoISO(3),
    },
    {
      title: "This New Framework Changes Everything",
      channelName: "ThePrimeagen",
      viewCount: "842K views",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      publishedAt: daysAgoISO(2),
    },
    {
      title: "How to Build a Startup from $0 to $1M",
      channelName: "Y Combinator",
      viewCount: "1.5M views",
      thumbnailUrl: "https://i.ytimg.com/vi/ZoqgAy3h4OM/hqdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=ZoqgAy3h4OM",
      publishedAt: daysAgoISO(5),
    },
    {
      title: "The Attention Mechanism in 12 Minutes",
      channelName: "Andrej Karpathy",
      viewCount: "3.2M views",
      thumbnailUrl: "https://i.ytimg.com/vi/eMlx5fFNoYc/hqdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=eMlx5fFNoYc",
      publishedAt: daysAgoISO(4),
    },
    {
      title: "M4 MacBook Pro — The Best Laptop Money Can Buy?",
      channelName: "MKBHD",
      viewCount: "5.8M views",
      thumbnailUrl: "https://i.ytimg.com/vi/6Dx6D2fKVYY/hqdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=6Dx6D2fKVYY",
      publishedAt: daysAgoISO(7),
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getYouTube(userId: string): Promise<YouTubeItem[]> {
  const live = await getYouTubeLive(userId);
  if (live && live.length > 0) return live;
  return getYouTubeDemo();
}

export { getYouTubeDemo };
