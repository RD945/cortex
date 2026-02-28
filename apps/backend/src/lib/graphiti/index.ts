/**
 * Graphiti Knowledge Graph Module
 *
 * Provides long-term memory for AI agents via knowledge graph storage.
 */

export {
  graphitiClient,
  type GraphitiFact,
  type GraphitiMessage,
  type SearchResults,
} from "./client.js";

export {
  bulkIngestForUser,
  type BulkIngestOptions,
  type BulkIngestResult,
} from "./bulk-ingest.js";
