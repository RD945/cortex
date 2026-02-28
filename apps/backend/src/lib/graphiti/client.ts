/**
 * Graphiti Knowledge Graph Client
 *
 * HTTP client for the Graphiti FastAPI service.
 * All methods gracefully no-op if graphiti is disabled.
 */

import { config } from "../../config/index.js";
import { createChildLogger } from "../logger.js";

const logger = createChildLogger("graphiti");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphitiMessage {
  uuid?: string;
  name?: string;
  role_type: "user" | "assistant" | "system";
  role?: string;
  content: string;
  source_description?: string;
  timestamp?: string; // ISO datetime
}

export interface GraphitiFact {
  uuid: string;
  name: string;
  fact: string;
  valid_at: string | null;
  invalid_at: string | null;
  created_at: string;
  expired_at: string | null;
}

export interface AddMessagesRequest {
  group_id: string;
  messages: GraphitiMessage[];
}

export interface SearchQuery {
  group_ids?: string[];
  query: string;
  max_facts?: number;
}

export interface SearchResults {
  facts: GraphitiFact[];
}

// ─── Client Class ────────────────────────────────────────────────────────────

class GraphitiClient {
  private get baseUrl() {
    return config.graphiti.url;
  }
  private get enabled() {
    return config.graphiti.enabled;
  }

  /**
   * Add conversation messages as episodes (fire-and-forget safe)
   * Messages are queued for async processing by Graphiti
   */
  async addMessages(groupId: string, messages: GraphitiMessage[]): Promise<void> {
    if (!this.enabled) return;

    try {
      const body: AddMessagesRequest = {
        group_id: groupId,
        messages: messages.map((m) => ({
          ...m,
          uuid: m.uuid ?? crypto.randomUUID(),
          timestamp: m.timestamp ?? new Date().toISOString(),
        })),
      };

      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      logger.debug({ groupId, count: messages.length }, "Messages queued for KG ingestion");
    } catch (err) {
      // Non-fatal - log and continue
      logger.warn({ err, groupId }, "Graphiti addMessages failed (non-fatal)");
    }
  }

  /**
   * Search the knowledge graph for relevant facts
   * Returns empty array on failure (graceful degradation)
   */
  async search(query: string, groupId: string, maxFacts = 10): Promise<GraphitiFact[]> {
    if (!this.enabled) return [];

    try {
      const body: SearchQuery = {
        query,
        group_ids: [groupId],
        max_facts: maxFacts,
      };

      const res = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as SearchResults;
      logger.debug({ groupId, query: query.slice(0, 50), count: data.facts?.length ?? 0 }, "KG search completed");
      return data.facts ?? [];
    } catch (err) {
      // Non-fatal - return empty results
      logger.warn({ err, groupId, query: query.slice(0, 50) }, "Graphiti search failed (non-fatal)");
      return [];
    }
  }

  /**
   * Delete all graph data for a user group (e.g., on account deletion)
   */
  async deleteGroup(groupId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const res = await fetch(`${this.baseUrl}/group/${encodeURIComponent(groupId)}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      logger.info({ groupId }, "Group deleted from knowledge graph");
    } catch (err) {
      // Non-fatal - log and continue
      logger.warn({ err, groupId }, "Graphiti deleteGroup failed (non-fatal)");
    }
  }

  /**
   * Health check for the Graphiti service
   */
  async healthcheck(): Promise<boolean> {
    if (!this.enabled) return true; // Considered healthy when disabled

    try {
      const res = await fetch(`${this.baseUrl}/healthcheck`, {
        method: "GET",
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const graphitiClient = new GraphitiClient();
