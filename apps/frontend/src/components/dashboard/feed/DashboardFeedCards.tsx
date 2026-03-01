import { useEffect, useState } from "react";
import { FinanceCard } from "./FinanceCard";
import { MusicCard } from "./MusicCard";
import { NewsCard } from "./NewsCard";
import { YouTubeCard } from "./YouTubeCard";
import type { DashboardFeedData } from "./types";

export function DashboardFeedCards() {
  const [data, setData] = useState<DashboardFeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchFeeds() {
      try {
        const response = await fetch("/api/dashboard/feeds", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Failed to fetch dashboard feeds:", response.statusText);
          return;
        }

        const result = await response.json();
        if (!cancelled) setData(result);
      } catch (err) {
        console.error("Error fetching dashboard feeds:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchFeeds();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`feed-skeleton-${i}`}
            className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-xl h-64 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const hasNews = data.news.length > 0;
  const hasFinance = data.finance.length > 0;
  const hasMusic = data.music.length > 0;
  const hasYouTube = data.youtube.length > 0;
  const visibleCount = [hasNews, hasFinance, hasMusic, hasYouTube].filter(Boolean).length;

  if (visibleCount === 0) return null;

  // Dynamic grid: 1 col on mobile, 2 on md, up to count on xl
  const gridClass =
    visibleCount <= 2
      ? "grid grid-cols-1 md:grid-cols-2 gap-4"
      : visibleCount === 3
        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4";

  return (
    <div className={gridClass}>
      {hasNews && <NewsCard items={data.news} />}
      {hasFinance && <FinanceCard items={data.finance} />}
      {hasMusic && <MusicCard items={data.music} />}
      {hasYouTube && <YouTubeCard items={data.youtube} />}
    </div>
  );
}
