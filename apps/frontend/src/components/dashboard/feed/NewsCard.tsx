import { ExternalLink, Newspaper, Zap } from "lucide-react";
import type { NewsItem } from "./types";

interface NewsCardProps {
  items: NewsItem[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NewsCard({ items }: NewsCardProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-400/15">
          <Newspaper className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Latest News
        </h3>
      </div>

      {/* News List */}
      <div className="px-5 pb-5 space-y-1">
        {items.slice(0, 6).map((item) => (
          <a
            key={`${item.title}-${item.publishedAt}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl px-3 py-2.5 -mx-1 transition-colors hover:bg-black/3 dark:hover:bg-white/6"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {item.category === "breaking" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 shrink-0">
                    <Zap className="h-2.5 w-2.5" />
                    BREAKING
                  </span>
                )}
                <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {item.source}
                </span>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(item.publishedAt)}
                </span>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 mt-1 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
