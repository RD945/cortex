export interface NewsItem {
  title: string;
  source: string;
  snippet: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
  category?: "breaking" | "tech";
}

export interface FinanceItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent: number;
  sparkline: number[];
  type: "crypto" | "stock";
  logoUrl?: string;
}

export interface MusicItem {
  title: string;
  artist: string;
  album: string;
  albumArtUrl?: string;
  duration: string;
  sourceUrl?: string;
  playedAt?: string;
}

export interface YouTubeItem {
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  viewCount?: string;
  sourceUrl: string;
  publishedAt?: string;
}

export interface DashboardFeedData {
  news: NewsItem[];
  finance: FinanceItem[];
  music: MusicItem[];
  youtube: YouTubeItem[];
}
