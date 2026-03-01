/**
 * Shared types for the connector system.
 *
 * Each connector transforms external service data into Cortex entity types:
 *   Gmail   → notes
 *   YouTube → bookmarks
 *   Calendar → tasks
 *   Drive   → documents (metadata only)
 *   Last.fm → notes
 */

/** A single item ready to be persisted via the existing Cortex service layer. */
export interface ImportedItem {
  /** Which Cortex entity this maps to */
  type: "note" | "bookmark" | "task";
  /** Human-readable title / subject */
  title: string;
  /** Rich-text or markdown body */
  content: string;
  /** Where the item originally came from */
  sourceUrl?: string;
  /** ISO-8601 timestamp from the external service */
  sourceDate?: string;
  /** Tags to attach */
  tags?: string[];
  /** Extra metadata blob (stored as JSON in the entity) */
  metadata?: Record<string, unknown>;
}

/** Summary returned after an import run. */
export interface ImportResult {
  provider: string;
  service: string;
  imported: number;
  skipped: number;
  errors: string[];
}

/** Describes one connected account row returned to the frontend. */
export interface ConnectionInfo {
  provider: "google" | "lastfm";
  accountId: string;
  email?: string;
  displayName?: string;
  connectedAt: string;
  /** Which sub-services the user has imported from */
  availableServices: string[];
}
