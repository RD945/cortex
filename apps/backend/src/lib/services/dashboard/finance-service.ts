/**
 * Finance Service
 *
 * Fetches cryptocurrency data from CoinGecko (free, no API key)
 * and optionally stock data from Alpha Vantage (free key optional).
 * Falls back to realistic demo data on failure.
 */

import { createChildLogger } from "../../logger.js";
import type { FinanceItem } from "./types.js";

const logger = createChildLogger("dashboard:finance");

// ---------------------------------------------------------------------------
// CoinGecko — free tier, no key, 30 req/min
// ---------------------------------------------------------------------------
async function getCryptoLive(): Promise<FinanceItem[]> {
  try {
    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd" +
      "&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,polkadot,avalanche-2" +
      "&order=market_cap_desc&sparkline=true" +
      "&price_change_percentage=24h";

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = (await res.json()) as Array<{
      symbol: string;
      name: string;
      current_price: number;
      price_change_24h: number;
      price_change_percentage_24h: number;
      sparkline_in_7d?: { price: number[] };
      image?: string;
    }>;

    return data.map((coin) => {
      const prices = coin.sparkline_in_7d?.price ?? [];
      // Sample 7 evenly-spaced points from the sparkline
      const step = Math.max(1, Math.floor(prices.length / 7));
      const sparkline = Array.from({ length: 7 }, (_, i) =>
        Math.round((prices[Math.min(i * step, prices.length - 1)] ?? 0) * 100) / 100,
      );

      return {
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_24h,
        changePercent: coin.price_change_percentage_24h,
        sparkline,
        type: "crypto" as const,
        logoUrl: coin.image,
      };
    });
  } catch (err) {
    logger.warn({ err }, "CoinGecko fetch failed");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Alpha Vantage — optional, requires ALPHA_VANTAGE_API_KEY env var
// ---------------------------------------------------------------------------
async function getStocksLive(): Promise<FinanceItem[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return [];

  const tickers = ["AAPL", "NVDA", "TSLA", "MSFT", "GOOGL", "AMZN", "META", "AMD"];
  const results: FinanceItem[] = [];

  for (const symbol of tickers) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;

      const data = (await res.json()) as {
        "Global Quote"?: {
          "05. price"?: string;
          "09. change"?: string;
          "10. change percent"?: string;
        };
      };

      const quote = data["Global Quote"];
      if (!quote) continue;

      const price = parseFloat(quote["05. price"] ?? "0");
      const change = parseFloat(quote["09. change"] ?? "0");
      const pct = parseFloat((quote["10. change percent"] ?? "0").replace("%", ""));

      results.push({
        symbol,
        name: { 
          AAPL: "Apple", 
          NVDA: "NVIDIA", 
          TSLA: "Tesla", 
          MSFT: "Microsoft",
          GOOGL: "Alphabet",
          AMZN: "Amazon",
          META: "Meta",
          AMD: "AMD"
        }[symbol] ?? symbol,
        price,
        change24h: change,
        changePercent: pct,
        sparkline: [], // Alpha Vantage Global Quote doesn't include sparkline
        type: "stock",
      });
    } catch (err) {
      logger.warn({ err, symbol }, "Alpha Vantage fetch failed");
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------
function getFinanceDemo(): FinanceItem[] {
  return [
    // Crypto
    {
      symbol: "BTC",
      name: "Bitcoin",
      price: 97284.32,
      change24h: 1842.15,
      changePercent: 1.93,
      sparkline: [94200, 95100, 94800, 96300, 95900, 97100, 97284],
      type: "crypto",
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      price: 3847.61,
      change24h: -52.38,
      changePercent: -1.34,
      sparkline: [3920, 3890, 3870, 3810, 3850, 3830, 3848],
      type: "crypto",
    },
    {
      symbol: "SOL",
      name: "Solana",
      price: 198.45,
      change24h: 8.72,
      changePercent: 4.59,
      sparkline: [185, 188, 191, 190, 194, 196, 198],
      type: "crypto",
    },
    {
      symbol: "ADA",
      name: "Cardano",
      price: 0.847,
      change24h: -0.023,
      changePercent: -2.64,
      sparkline: [0.88, 0.87, 0.86, 0.85, 0.86, 0.84, 0.85],
      type: "crypto",
    },
    {
      symbol: "XRP",
      name: "Ripple",
      price: 2.18,
      change24h: 0.12,
      changePercent: 5.82,
      sparkline: [2.02, 2.05, 2.08, 2.10, 2.14, 2.16, 2.18],
      type: "crypto",
    },
    {
      symbol: "DOGE",
      name: "Dogecoin",
      price: 0.324,
      change24h: 0.018,
      changePercent: 5.88,
      sparkline: [0.30, 0.31, 0.31, 0.32, 0.32, 0.32, 0.324],
      type: "crypto",
    },
    {
      symbol: "DOT",
      name: "Polkadot",
      price: 7.42,
      change24h: -0.28,
      changePercent: -3.64,
      sparkline: [7.80, 7.70, 7.60, 7.55, 7.50, 7.45, 7.42],
      type: "crypto",
    },
    {
      symbol: "AVAX",
      name: "Avalanche",
      price: 38.74,
      change24h: 1.52,
      changePercent: 4.08,
      sparkline: [36.50, 37.00, 37.40, 37.80, 38.20, 38.50, 38.74],
      type: "crypto",
    },
    // Stocks
    {
      symbol: "AAPL",
      name: "Apple",
      price: 241.84,
      change24h: 3.52,
      changePercent: 1.48,
      sparkline: [235, 237, 236, 239, 238, 240, 242],
      type: "stock",
    },
    {
      symbol: "NVDA",
      name: "NVIDIA",
      price: 924.79,
      change24h: 18.63,
      changePercent: 2.06,
      sparkline: [890, 895, 905, 910, 908, 920, 925],
      type: "stock",
    },
    {
      symbol: "TSLA",
      name: "Tesla",
      price: 378.92,
      change24h: -12.47,
      changePercent: -3.19,
      sparkline: [395, 390, 388, 385, 382, 380, 379],
      type: "stock",
    },
    {
      symbol: "MSFT",
      name: "Microsoft",
      price: 468.35,
      change24h: 5.21,
      changePercent: 1.12,
      sparkline: [460, 462, 463, 465, 464, 467, 468],
      type: "stock",
    },
    {
      symbol: "GOOGL",
      name: "Alphabet",
      price: 182.45,
      change24h: 2.87,
      changePercent: 1.60,
      sparkline: [178, 179, 180, 179, 181, 182, 182],
      type: "stock",
    },
    {
      symbol: "AMZN",
      name: "Amazon",
      price: 224.18,
      change24h: -1.92,
      changePercent: -0.85,
      sparkline: [227, 226, 225, 224, 225, 224, 224],
      type: "stock",
    },
    {
      symbol: "META",
      name: "Meta",
      price: 612.34,
      change24h: 8.76,
      changePercent: 1.45,
      sparkline: [598, 600, 605, 608, 610, 611, 612],
      type: "stock",
    },
    {
      symbol: "AMD",
      name: "AMD",
      price: 164.82,
      change24h: 4.23,
      changePercent: 2.64,
      sparkline: [158, 159, 161, 162, 163, 164, 165],
      type: "stock",
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getFinance(): Promise<FinanceItem[]> {
  try {
    const [crypto, stocks] = await Promise.allSettled([
      getCryptoLive(),
      getStocksLive(),
    ]);

    const liveCrypto =
      crypto.status === "fulfilled" && crypto.value.length > 0
        ? crypto.value
        : [];
    const liveStocks =
      stocks.status === "fulfilled" && stocks.value.length > 0
        ? stocks.value
        : [];

    const combined = [...liveCrypto, ...liveStocks];

    if (combined.length >= 2) return combined;

    // Not enough live data — return demo
    logger.info("Insufficient live finance data, using demo");
    return getFinanceDemo();
  } catch (err) {
    logger.warn({ err }, "Finance fetch failed, returning demo data");
    return getFinanceDemo();
  }
}

export { getFinanceDemo };
