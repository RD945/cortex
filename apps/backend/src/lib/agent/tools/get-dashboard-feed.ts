/**
 * Get Dashboard Feed Tool
 *
 * Retrieve live dashboard feed data (news, finance, music, YouTube).
 */

import { tool } from "@cortex/ai";
import z from "zod/v4";
import {
  getFinance,
  getMusic,
  getNews,
  getYouTube,
} from "../../services/dashboard/index.js";
import type { BackendAgentContext } from "../types.js";

const inputSchema = z.object({
  feedType: z
    .enum(["all", "news", "finance", "music", "youtube"])
    .optional()
    .default("all")
    .describe(
      "Which feed to retrieve. 'all' returns every category, or pick a specific one.",
    ),
});

export const getDashboardFeedTool = tool<
  typeof inputSchema,
  BackendAgentContext
>({
  name: "getDashboardFeed",
  description:
    "Retrieve live dashboard feed data including latest tech news, crypto/stock market prices, recently played music, and YouTube videos.",
  inputSchema,
  execute: async (input, context) => {
    const userId = context.userId;

    if (input.feedType === "all") {
      const [news, finance, music, youtube] = await Promise.all([
        getNews(),
        getFinance(),
        getMusic(userId),
        getYouTube(userId),
      ]);
      return {
        success: true,
        content: JSON.stringify({ news, finance, music, youtube }, null, 2),
      };
    }

    let result: unknown;
    switch (input.feedType) {
      case "news":
        result = await getNews();
        break;
      case "finance":
        result = await getFinance();
        break;
      case "music":
        result = await getMusic(userId);
        break;
      case "youtube":
        result = await getYouTube(userId);
        break;
    }

    return {
      success: true,
      content: JSON.stringify(result, null, 2),
    };
  },
});
