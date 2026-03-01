/**
 * Music Service
 *
 * Returns user's recently played Last.fm tracks when configured,
 * otherwise returns realistic demo data.
 */

import { createChildLogger } from "../../logger.js";
import { getRecentTracks } from "../connectors/lastfm-connector.js";
import type { MusicItem } from "./types.js";

const logger = createChildLogger("dashboard:music");

// ---------------------------------------------------------------------------
// Live — pull from Last.fm (API key auth, no OAuth needed)
// ---------------------------------------------------------------------------
async function getMusicLive(_userId: string): Promise<MusicItem[] | null> {
  try {
    // Last.fm uses API key auth — no per-user OAuth token needed
    const apiKey = process.env.LASTFM_API_KEY;
    const username = process.env.LASTFM_USERNAME;
    if (!apiKey || !username) return null;

    const items = await getRecentTracks(username, 6);

    return items.map((item) => ({
      title: item.title.includes(" — ")
        ? item.title.split(" — ")[0]
        : item.title,
      artist:
        (item.metadata?.artists as string) ??
        item.content.match(/\*\*Artist:\*\* (.+)/)?.[1] ??
        "Unknown",
      album:
        (item.metadata?.albumName as string) ??
        item.content.match(/\*\*Album:\*\* (.+)/)?.[1] ??
        "",
      albumArtUrl: item.metadata?.albumArt as string | undefined,
      duration: "",
      sourceUrl: item.sourceUrl,
      playedAt: item.sourceDate,
    }));
  } catch (err) {
    logger.warn({ err }, "Failed to fetch live Last.fm data");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------
function hoursAgoISO(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function getMusicDemo(): MusicItem[] {
  return [
    {
      title: "Rosewood",
      artist: "Bonobo",
      album: "Fragments",
      duration: "5:12",
      sourceUrl: "https://www.last.fm/music/Bonobo/_/Rosewood",
      playedAt: hoursAgoISO(1),
    },
    {
      title: "A Walk",
      artist: "Tycho",
      album: "Dive",
      duration: "5:22",
      sourceUrl: "https://www.last.fm/music/Tycho/_/A+Walk",
      playedAt: hoursAgoISO(2),
    },
    {
      title: "Time (You and I)",
      artist: "Khruangbin",
      album: "Con Todo El Mundo",
      duration: "3:53",
      sourceUrl: "https://www.last.fm/music/Khruangbin/_/Time+(You+and+I)",
      playedAt: hoursAgoISO(3),
    },
    {
      title: "Let It Happen",
      artist: "Tame Impala",
      album: "Currents",
      duration: "7:43",
      sourceUrl: "https://www.last.fm/music/Tame+Impala/_/Let+It+Happen",
      playedAt: hoursAgoISO(5),
    },
    {
      title: "Midnight City",
      artist: "M83",
      album: "Hurry Up, We're Dreaming",
      duration: "4:03",
      sourceUrl: "https://www.last.fm/music/M83/_/Midnight+City",
      playedAt: hoursAgoISO(8),
    },
    {
      title: "Tadow",
      artist: "Masego & FKJ",
      album: "Tadow",
      duration: "5:48",
      sourceUrl: "https://www.last.fm/music/Masego/_/Tadow",
      playedAt: hoursAgoISO(12),
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getMusic(userId: string): Promise<MusicItem[]> {
  const live = await getMusicLive(userId);
  if (live && live.length > 0) return live;
  return getMusicDemo();
}

export { getMusicDemo };
