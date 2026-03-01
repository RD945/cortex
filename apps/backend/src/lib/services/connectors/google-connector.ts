/**
 * Google Connector
 *
 * Uses the `googleapis` npm package to pull data from Gmail, YouTube,
 * Google Calendar, and Google Drive using the OAuth access token
 * that Better Auth stored in the `accounts` table.
 */

import { google } from "googleapis";
import { createChildLogger } from "../../logger.js";
import type { ImportedItem, ImportResult } from "./types.js";

const logger = createChildLogger("connector:google");

// ---------------------------------------------------------------------------
// Helper – create an authenticated OAuth2 client from raw tokens
// ---------------------------------------------------------------------------
function createOAuth2Client(accessToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ access_token: accessToken });
  return oauth2;
}

// ---------------------------------------------------------------------------
// Gmail
// ---------------------------------------------------------------------------
export async function importGmailMessages(
  accessToken: string,
  maxResults = 25,
): Promise<ImportResult> {
  const items: ImportedItem[] = [];
  const errors: string[] = [];

  try {
    const auth = createOAuth2Client(accessToken);
    const gmail = google.gmail({ version: "v1", auth });

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: "is:inbox",
    });

    const messageIds = listRes.data.messages ?? [];

    for (const msg of messageIds) {
      try {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = detail.data.payload?.headers ?? [];
        const subject =
          headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
        const from =
          headers.find((h) => h.name === "From")?.value ?? "unknown";
        const date = headers.find((h) => h.name === "Date")?.value;
        const snippet = detail.data.snippet ?? "";

        items.push({
          type: "note",
          title: subject,
          content: `**From:** ${from}\n\n${snippet}`,
          sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
          sourceDate: date ? new Date(date).toISOString() : undefined,
          tags: ["gmail", "email"],
          metadata: { gmailMessageId: msg.id, from },
        });
      } catch (err) {
        errors.push(
          `Failed to fetch message ${msg.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } catch (err) {
    errors.push(
      `Gmail list failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  logger.info(
    { imported: items.length, errors: errors.length },
    "Gmail import complete",
  );

  return {
    provider: "google",
    service: "gmail",
    imported: items.length,
    skipped: 0,
    errors,
  };
}

/** Return the raw imported items so the route can persist them. */
export async function getGmailItems(
  accessToken: string,
  maxResults = 25,
): Promise<ImportedItem[]> {
  const items: ImportedItem[] = [];

  const auth = createOAuth2Client(accessToken);
  const gmail = google.gmail({ version: "v1", auth });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "is:inbox",
  });

  for (const msg of listRes.data.messages ?? []) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });

    const headers = detail.data.payload?.headers ?? [];
    const subject =
      headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
    const from = headers.find((h) => h.name === "From")?.value ?? "unknown";
    const date = headers.find((h) => h.name === "Date")?.value;
    const snippet = detail.data.snippet ?? "";

    items.push({
      type: "note",
      title: subject,
      content: `**From:** ${from}\n\n${snippet}`,
      sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
      sourceDate: date ? new Date(date).toISOString() : undefined,
      tags: ["gmail", "email"],
      metadata: { gmailMessageId: msg.id, from },
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// YouTube – liked / saved videos → bookmarks
// ---------------------------------------------------------------------------
export async function getYouTubeItems(
  accessToken: string,
  maxResults = 25,
): Promise<ImportedItem[]> {
  const items: ImportedItem[] = [];

  const auth = createOAuth2Client(accessToken);
  const youtube = google.youtube({ version: "v3", auth });

  const res = await youtube.videos.list({
    part: ["snippet", "contentDetails"],
    myRating: "like",
    maxResults,
  });

  for (const video of res.data.items ?? []) {
    const snippet = video.snippet;
    if (!snippet) continue;

    items.push({
      type: "bookmark",
      title: snippet.title ?? "YouTube Video",
      content: snippet.description ?? "",
      sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
      sourceDate: snippet.publishedAt ?? undefined,
      tags: ["youtube", "video"],
      metadata: {
        youtubeVideoId: video.id,
        channelTitle: snippet.channelTitle,
        thumbnailUrl: snippet.thumbnails?.high?.url,
      },
    });
  }

  logger.info({ count: items.length }, "YouTube import complete");
  return items;
}

// ---------------------------------------------------------------------------
// Google Calendar events → tasks
// ---------------------------------------------------------------------------
export async function getCalendarItems(
  accessToken: string,
  maxResults = 50,
): Promise<ImportedItem[]> {
  const items: ImportedItem[] = [];

  const auth = createOAuth2Client(accessToken);
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  for (const event of res.data.items ?? []) {
    items.push({
      type: "task",
      title: event.summary ?? "Calendar Event",
      content: event.description ?? "",
      sourceUrl: event.htmlLink ?? undefined,
      sourceDate:
        event.start?.dateTime ?? event.start?.date ?? now.toISOString(),
      tags: ["calendar", "event"],
      metadata: {
        calendarEventId: event.id,
        location: event.location,
        startTime: event.start?.dateTime ?? event.start?.date,
        endTime: event.end?.dateTime ?? event.end?.date,
      },
    });
  }

  logger.info({ count: items.length }, "Calendar import complete");
  return items;
}
