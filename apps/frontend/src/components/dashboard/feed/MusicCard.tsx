import { ExternalLink, Music } from "lucide-react";
import type { MusicItem } from "./types";

interface MusicCardProps {
  items: MusicItem[];
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

export function MusicCard({ items }: MusicCardProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10 dark:bg-green-400/15">
          <Music className="h-4 w-4 text-green-500 dark:text-green-400" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Recently Played
        </h3>
      </div>

      {/* Track List */}
      <div className="px-5 pb-5 space-y-0.5">
        {items.slice(0, 5).map((item, idx) => (
          <div
            key={`${item.title}-${item.artist}-${idx}`}
            className="group flex items-center gap-3 rounded-xl px-3 py-2 -mx-1 transition-colors hover:bg-black/3 dark:hover:bg-white/6"
          >
            {/* Album Art */}
            <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted/70">
              {item.albumArtUrl ? (
                <img
                  src={item.albumArtUrl}
                  alt={item.album}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Music className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-snug text-foreground truncate">
                {item.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-muted-foreground truncate">
                  {item.artist}
                </span>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {item.duration}
                </span>
              </div>
            </div>

            {/* Time / Link */}
            <div className="flex items-center gap-2 shrink-0">
              {item.playedAt && (
                <span className="text-[10px] text-muted-foreground/50">
                  {timeAgo(item.playedAt)}
                </span>
              )}
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
