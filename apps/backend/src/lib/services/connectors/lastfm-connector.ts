/**
 * Last.fm Connector
 *
 * Uses the Last.fm REST API (API key auth, no OAuth needed) to pull
 * music data: recent tracks, top artists, top tracks, top albums.
 *
 * API docs: https://www.last.fm/api
 * Rate limit: ~5 requests/second (no hard enforcement)
 */

import { createChildLogger } from "../../logger.js";
import type { ImportedItem } from "./types.js";

const logger = createChildLogger("connector:lastfm");

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

interface LastFmImage {
  "#text": string;
  size: string;
}

interface LastFmArtist {
  name: string;
  url: string;
  mbid?: string;
}

interface LastFmAlbum {
  "#text": string;
  mbid?: string;
}

interface LastFmRecentTrack {
  name: string;
  artist: LastFmArtist | { "#text": string };
  album: LastFmAlbum;
  url: string;
  image: LastFmImage[];
  date?: { uts: string; "#text": string };
  "@attr"?: { nowplaying: string };
}

interface LastFmTopArtist {
  name: string;
  playcount: string;
  url: string;
  image: LastFmImage[];
}

interface LastFmTopTrack {
  name: string;
  playcount: string;
  artist: { name: string; url: string };
  url: string;
  image: LastFmImage[];
  duration: string;
}

interface LastFmTopAlbum {
  name: string;
  playcount: string;
  artist: { name: string; url: string };
  url: string;
  image: LastFmImage[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error("LASTFM_API_KEY is not set");
  return key;
}

function getUsername(): string {
  const user = process.env.LASTFM_USERNAME;
  if (!user) throw new Error("LASTFM_USERNAME is not set");
  return user;
}

function getLargestImage(images: LastFmImage[]): string | undefined {
  // Last.fm images come in: small, medium, large, extralarge
  for (const size of ["extralarge", "large", "medium", "small"]) {
    const img = images.find((i) => i.size === size);
    if (img && img["#text"]) return img["#text"];
  }
  return undefined;
}

function getArtistName(artist: LastFmArtist | { "#text": string }): string {
  if ("name" in artist) return artist.name;
  return artist["#text"] || "Unknown";
}

async function lastfmFetch<T>(method: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(LASTFM_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Last.fm API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Recent Tracks → ImportedItem[]
// ---------------------------------------------------------------------------
export async function getRecentTracks(
  username?: string,
  limit = 50,
): Promise<ImportedItem[]> {
  const user = username || getUsername();
  const data = await lastfmFetch<{
    recenttracks: { track: LastFmRecentTrack[] };
  }>("user.getRecentTracks", { user, limit: String(limit) });

  const tracks = data.recenttracks?.track ?? [];
  const items: ImportedItem[] = [];

  for (const track of tracks) {
    // Skip "now playing" entry (has no date)
    if (track["@attr"]?.nowplaying === "true") continue;

    const artist = getArtistName(track.artist);
    const albumName = track.album?.["#text"] || "";
    const playedAt = track.date
      ? new Date(Number.parseInt(track.date.uts) * 1000).toISOString()
      : undefined;

    items.push({
      type: "note",
      title: `${track.name} — ${artist}`,
      content: [
        `**Track:** ${track.name}`,
        `**Artist:** ${artist}`,
        albumName ? `**Album:** ${albumName}` : "",
        playedAt ? `**Played at:** ${playedAt}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      sourceUrl: track.url,
      sourceDate: playedAt,
      tags: ["lastfm", "recently-played"],
      metadata: {
        albumArt: getLargestImage(track.image),
        albumName,
        artists: artist,
      },
    });
  }

  logger.info({ count: items.length }, "Last.fm recent tracks import complete");
  return items;
}

// ---------------------------------------------------------------------------
// Top Artists → ImportedItem[]
// ---------------------------------------------------------------------------
export async function getTopArtists(
  username?: string,
  limit = 20,
  period = "3month",
): Promise<ImportedItem[]> {
  const user = username || getUsername();
  const data = await lastfmFetch<{
    topartists: { artist: LastFmTopArtist[] };
  }>("user.getTopArtists", { user, limit: String(limit), period });

  const artists = data.topartists?.artist ?? [];
  const items: ImportedItem[] = [];

  for (const artist of artists) {
    items.push({
      type: "note",
      title: `Top Artist: ${artist.name}`,
      content: [
        `**Artist:** ${artist.name}`,
        `**Play count:** ${Number(artist.playcount).toLocaleString()}`,
      ].join("\n"),
      sourceUrl: artist.url,
      tags: ["lastfm", "artist", "top-artists"],
      metadata: {
        playcount: Number(artist.playcount),
        imageUrl: getLargestImage(artist.image),
      },
    });
  }

  logger.info({ count: items.length }, "Last.fm top artists import complete");
  return items;
}

// ---------------------------------------------------------------------------
// Top Tracks → ImportedItem[]
// ---------------------------------------------------------------------------
export async function getTopTracks(
  username?: string,
  limit = 20,
  period = "3month",
): Promise<ImportedItem[]> {
  const user = username || getUsername();
  const data = await lastfmFetch<{
    toptracks: { track: LastFmTopTrack[] };
  }>("user.getTopTracks", { user, limit: String(limit), period });

  const tracks = data.toptracks?.track ?? [];
  const items: ImportedItem[] = [];

  for (const track of tracks) {
    const durationSec = Number(track.duration) || 0;
    const durationStr = durationSec > 0
      ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
      : "";

    items.push({
      type: "note",
      title: `${track.name} — ${track.artist.name}`,
      content: [
        `**Track:** ${track.name}`,
        `**Artist:** ${track.artist.name}`,
        `**Play count:** ${Number(track.playcount).toLocaleString()}`,
        durationStr ? `**Duration:** ${durationStr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      sourceUrl: track.url,
      tags: ["lastfm", "top-tracks"],
      metadata: {
        playcount: Number(track.playcount),
        duration: durationSec,
        imageUrl: getLargestImage(track.image),
      },
    });
  }

  logger.info({ count: items.length }, "Last.fm top tracks import complete");
  return items;
}

// ---------------------------------------------------------------------------
// Top Albums → ImportedItem[]
// ---------------------------------------------------------------------------
export async function getTopAlbums(
  username?: string,
  limit = 20,
  period = "3month",
): Promise<ImportedItem[]> {
  const user = username || getUsername();
  const data = await lastfmFetch<{
    topalbums: { album: LastFmTopAlbum[] };
  }>("user.getTopAlbums", { user, limit: String(limit), period });

  const albums = data.topalbums?.album ?? [];
  const items: ImportedItem[] = [];

  for (const album of albums) {
    items.push({
      type: "note",
      title: `${album.name} — ${album.artist.name}`,
      content: [
        `**Album:** ${album.name}`,
        `**Artist:** ${album.artist.name}`,
        `**Play count:** ${Number(album.playcount).toLocaleString()}`,
      ].join("\n"),
      sourceUrl: album.url,
      tags: ["lastfm", "album", "top-albums"],
      metadata: {
        playcount: Number(album.playcount),
        imageUrl: getLargestImage(album.image),
      },
    });
  }

  logger.info({ count: items.length }, "Last.fm top albums import complete");
  return items;
}
