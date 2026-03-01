import { ExternalLink, Play } from "lucide-react";
import type { YouTubeItem } from "./types";

interface YouTubeCardProps {
  items: YouTubeItem[];
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
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

function formatViews(count?: string): string {
  if (!count) return "";
  const n = Number.parseInt(count, 10);
  if (Number.isNaN(n)) return count;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

export function YouTubeCard({ items }: YouTubeCardProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 dark:bg-red-400/15">
          <Play className="h-4 w-4 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          YouTube
        </h3>
      </div>

      {/* Video List */}
      <div className="px-5 pb-5 space-y-0.5">
        {items.slice(0, 5).map((item, idx) => (
          <a
            key={`${item.title}-${idx}`}
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl px-3 py-2 -mx-1 transition-colors hover:bg-black/3 dark:hover:bg-white/6"
          >
            {/* Thumbnail */}
            <div className="relative h-12 w-18 shrink-0 rounded-lg overflow-hidden bg-muted/70">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Play className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-4 w-4 text-white fill-white" />
              </div>
            </div>

            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-muted-foreground font-medium truncate">
                  {item.channelName}
                </span>
                {item.viewCount && (
                  <>
                    <span className="text-[11px] text-muted-foreground/50">
                      ·
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatViews(item.viewCount)}
                    </span>
                  </>
                )}
                {item.publishedAt && (
                  <>
                    <span className="text-[11px] text-muted-foreground/50">
                      ·
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {timeAgo(item.publishedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ExternalLink className="h-3.5 w-3.5 mt-1 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
