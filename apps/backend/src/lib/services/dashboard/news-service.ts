/**
 * News Service
 *
 * Fetches latest tech news from RSS feeds (zero config, no API key).
 * Falls back to realistic demo data on failure.
 */

import Parser from "rss-parser";
import { createChildLogger } from "../../logger.js";
import type { NewsItem } from "./types.js";

const logger = createChildLogger("dashboard:news");

const RSS_FEEDS = [
  // Breaking / World News
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", category: "breaking" as const },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", category: "breaking" as const },
  { url: "https://feeds.npr.org/1001/rss.xml", source: "NPR News", category: "breaking" as const },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian", category: "breaking" as const },
  // Tech News
  { url: "https://techcrunch.com/feed/", source: "TechCrunch", category: "tech" as const },
  { url: "https://www.theverge.com/rss/index.xml", source: "The Verge", category: "tech" as const },
  { url: "https://hnrss.org/newest?count=10", source: "Hacker News", category: "tech" as const },
];

const parser = new Parser({ timeout: 10_000 });

// ---------------------------------------------------------------------------
// Live — parse RSS feeds
// ---------------------------------------------------------------------------
async function getNewsLive(): Promise<NewsItem[]> {
  const results: NewsItem[] = [];

  const feedPromises = RSS_FEEDS.map(async ({ url, source, category }) => {
    try {
      const feed = await parser.parseURL(url);
      for (const item of (feed.items ?? []).slice(0, 4)) {
        results.push({
          title: item.title ?? "Untitled",
          source,
          snippet:
            item.contentSnippet?.slice(0, 160) ??
            item.content?.slice(0, 160) ??
            "",
          url: item.link ?? "",
          publishedAt: item.isoDate ?? new Date().toISOString(),
          imageUrl: item.enclosure?.url,
          category,
        });
      }
    } catch (err) {
      logger.warn({ err, source }, "Failed to fetch RSS feed");
    }
  });

  await Promise.allSettled(feedPromises);

  // Sort by date descending, limit to 12
  results.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return results.slice(0, 12);
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function getNewsDemo(): NewsItem[] {
  return [
    {
      title: "UN Security Council Calls Emergency Session on Middle East Escalation",
      source: "BBC World",
      snippet:
        "World leaders gather for emergency talks as tensions rise across the region, with multiple nations calling for immediate ceasefire negotiations.",
      url: "https://bbc.com/news/world",
      publishedAt: daysAgoISO(0),
      category: "breaking",
    },
    {
      title: "EU Passes Comprehensive AI Regulation Framework, Effective 2027",
      source: "TechCrunch",
      snippet:
        "The European Parliament voted to adopt the AI Act's enforcement provisions, requiring all foundation model providers to register and submit transparency reports.",
      url: "https://techcrunch.com",
      publishedAt: daysAgoISO(0),
      category: "tech",
    },
    {
      title: "Global Climate Summit Produces Binding Emissions Agreement for 2030",
      source: "The Guardian",
      snippet:
        "196 nations signed the landmark accord committing to 45% emissions reduction by 2030, backed by a $500B Green Transition Fund.",
      url: "https://theguardian.com/world",
      publishedAt: daysAgoISO(0),
      category: "breaking",
    },
    {
      title: "NVIDIA Reports Record Q4 Revenue of $42B, Beats Estimates by 12%",
      source: "The Verge",
      snippet:
        "Data center GPU demand continues to surge as enterprise AI adoption accelerates. Jensen Huang announced next-gen Blackwell Ultra architecture.",
      url: "https://theverge.com",
      publishedAt: daysAgoISO(1),
      category: "tech",
    },
    {
      title: "Massive Earthquake Strikes Pacific Ring of Fire, Tsunami Warnings Issued",
      source: "Al Jazeera",
      snippet:
        "A 7.8 magnitude earthquake struck off the coast triggering tsunami advisories across the Pacific basin. Emergency services mobilized in multiple countries.",
      url: "https://aljazeera.com",
      publishedAt: daysAgoISO(1),
      category: "breaking",
    },
    {
      title: "Anthropic Raises $5B Series E at $80B Valuation",
      source: "TechCrunch",
      snippet:
        "The Claude-maker secured funding led by Google and Spark Capital, earmarked for compute scaling and safety research.",
      url: "https://techcrunch.com",
      publishedAt: daysAgoISO(1),
      category: "tech",
    },
    {
      title: "NPR Investigation Reveals Major Data Breach at Federal Agency",
      source: "NPR News",
      snippet:
        "Personal information of over 20 million citizens was compromised in what officials call the largest government data breach in recent history.",
      url: "https://npr.org",
      publishedAt: daysAgoISO(2),
      category: "breaking",
    },
    {
      title: "SpaceX Starship Completes First Full Orbital Flight Test",
      source: "Hacker News",
      snippet:
        "The fully reusable launch system achieved orbit insertion and controlled ocean landing of both stages after only 6 test flights.",
      url: "https://news.ycombinator.com",
      publishedAt: daysAgoISO(2),
      category: "tech",
    },
    {
      title: "Open Source LLM Benchmark: Llama 4 Surpasses GPT-4o on MMLU",
      source: "Hacker News",
      snippet:
        "Meta's latest open-weight model scores 92.1% on MMLU, beating commercial models while running on consumer GPUs via 4-bit quantization.",
      url: "https://news.ycombinator.com",
      publishedAt: daysAgoISO(2),
      category: "tech",
    },
    {
      title: "WHO Declares New Pandemic Preparedness Framework After Outbreak Scare",
      source: "BBC World",
      snippet:
        "The World Health Organization announced enhanced global surveillance protocols following the rapid spread of a novel respiratory pathogen in Southeast Asia.",
      url: "https://bbc.com/news/world",
      publishedAt: daysAgoISO(3),
      category: "breaking",
    },
    {
      title: "GitHub Copilot Adds Multi-File Editing and Autonomous Task Mode",
      source: "TechCrunch",
      snippet:
        "The AI coding assistant now supports orchestrated edits across entire repositories and can execute multi-step engineering tasks autonomously.",
      url: "https://techcrunch.com",
      publishedAt: daysAgoISO(3),
      category: "tech",
    },
    {
      title: "Rust Overtakes C++ in Stack Overflow Developer Survey 2026",
      source: "Hacker News",
      snippet:
        "For the first time, Rust ranks as the most-used systems programming language, driven by adoption in cloud infrastructure and embedded systems.",
      url: "https://news.ycombinator.com",
      publishedAt: daysAgoISO(4),
      category: "tech",
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getNews(): Promise<NewsItem[]> {
  try {
    const live = await getNewsLive();
    if (live.length >= 3) return live;
    logger.info("RSS returned too few items, using demo data");
    return getNewsDemo();
  } catch (err) {
    logger.warn({ err }, "News fetch failed, returning demo data");
    return getNewsDemo();
  }
}

export { getNewsDemo };
