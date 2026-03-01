import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { FinanceItem } from "./types";

interface FinanceCardProps {
  items: FinanceItem[];
}

/** Inline SVG sparkline — CoinMarketCap style */
function Sparkline({
  data,
  positive,
}: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;

  const w = 80;
  const h = 28;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-20 h-7"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={positive ? "#16C784" : "#EA3943"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

export function FinanceCard({ items }: FinanceCardProps) {
  const cryptoItems = items.filter((i) => i.type === "crypto");
  const stockItems = items.filter((i) => i.type === "stock");
  const hasBothTabs = cryptoItems.length > 0 && stockItems.length > 0;
  const [tab, setTab] = useState<"crypto" | "stocks">("crypto");
  const displayItems = tab === "crypto" ? cryptoItems : stockItems;

  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15">
            <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Markets
          </h3>
        </div>

        {hasBothTabs && (
          <div className="flex rounded-lg bg-muted/60 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setTab("crypto")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                tab === "crypto"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Crypto
            </button>
            <button
              type="button"
              onClick={() => setTab("stocks")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                tab === "stocks"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Stocks
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="px-5 pb-5">
        {/* Column Labels */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          <span>Name</span>
          <span className="text-right">Price</span>
          <span className="text-right w-14">24h</span>
          <span className="text-right w-20">7d Chart</span>
        </div>

        <div className="space-y-0.5">
          {displayItems.slice(0, 5).map((item) => {
            const positive = item.change24h >= 0;
            return (
              <div
                key={item.symbol}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 rounded-xl px-3 py-2 transition-colors hover:bg-black/3 dark:hover:bg-white/6"
              >
                {/* Symbol / Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/70 text-[10px] font-bold text-foreground/80">
                    {item.symbol.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {item.symbol}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.name}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <span className="text-[13px] font-semibold tabular-nums text-foreground text-right">
                  {formatPrice(item.price)}
                </span>

                {/* Change Badge */}
                <div className="flex items-center justify-end w-14">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                      positive
                        ? "bg-[#16C784]/10 text-[#16C784]"
                        : "bg-[#EA3943]/10 text-[#EA3943]"
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {Math.abs(item.changePercent).toFixed(1)}%
                  </span>
                </div>

                {/* Sparkline */}
                <div className="flex justify-end w-20">
                  <Sparkline data={item.sparkline} positive={positive} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
