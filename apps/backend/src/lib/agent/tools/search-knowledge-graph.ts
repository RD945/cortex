/**
 * Search Knowledge Graph Tool
 *
 * Allows the AI agent to explicitly query the knowledge graph
 * for facts and relationships from past conversations.
 */

import { tool } from "@cortex/ai";
import z from "zod/v4";
import { config } from "../../../config/index.js";
import { graphitiClient } from "../../graphiti/index.js";
import type { BackendAgentContext } from "../types.js";

const inputSchema = z.object({
  query: z.string().describe("Natural language query to search the knowledge graph"),
  maxFacts: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of facts to return"),
});

export const searchKnowledgeGraphTool = tool<typeof inputSchema, BackendAgentContext>({
  name: "searchKnowledgeGraph",
  description:
    "Search the knowledge graph for facts and relationships from past conversations. " +
    "Use this to recall information about the user, previous discussions, or stored knowledge. " +
    "Returns a list of relevant facts with their temporal context.",
  inputSchema,
  execute: async (input, context) => {
    // If Graphiti is disabled, return empty results gracefully
    if (!config.graphiti.enabled) {
      return {
        success: true,
        content: JSON.stringify({
          facts: [],
          message: "Knowledge graph is not enabled",
        }),
      };
    }

    const facts = await graphitiClient.search(
      input.query,
      context.userId,
      input.maxFacts,
    );

    // Format facts for the AI
    const formattedFacts = facts.map((f) => ({
      fact: f.fact,
      name: f.name,
      validAt: f.valid_at ? f.valid_at.slice(0, 10) : null,
      invalidAt: f.invalid_at ? f.invalid_at.slice(0, 10) : null,
      createdAt: f.created_at.slice(0, 10),
    }));

    return {
      success: true,
      content: JSON.stringify(
        {
          query: input.query,
          factsFound: formattedFacts.length,
          facts: formattedFacts,
        },
        null,
        2,
      ),
    };
  },
});
