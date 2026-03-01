// Load environment variables before anything else
import "../src/lib/env-loader";

import {
  createPgliteClient,
  createPostgresClient,
  createSqliteClient,
  getDatabaseType,
  getDatabaseUrl,
  getPGlitePath,
  getSqlitePath,
  pgSchema,
  sqliteSchema,
} from "@cortex/db";
import { hashPassword } from "better-auth/crypto";
import { eq, type InferInsertModel } from "drizzle-orm";
import {
  type BetterSQLite3Database,
  drizzle as drizzleSqlite,
} from "drizzle-orm/better-sqlite3";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import { config } from "../src/config/index.js";
import { hmacBase64 } from "../src/lib/api-key-security.js";

// Determine which schema to use
const dbType = getDatabaseType();
const schema = dbType === "sqlite" ? sqliteSchema : pgSchema;

// --- Drizzle Insert Types ---
type InsertUser = InferInsertModel<typeof schema.users>;
type InsertAccount = InferInsertModel<typeof schema.accounts>;
type InsertApiKey = InferInsertModel<typeof schema.apiKeys>;
type InsertTag = InferInsertModel<typeof schema.tags>;
type InsertNote = InferInsertModel<typeof schema.notes>;
type InsertBookmark = InferInsertModel<typeof schema.bookmarks>;
type InsertTask = InferInsertModel<typeof schema.tasks>;
type InsertTaskComment = InferInsertModel<typeof schema.taskComments>;
type InsertDocument = InferInsertModel<typeof schema.documents>;
type InsertConversation = InferInsertModel<typeof schema.conversations>;
type InsertMessage = InferInsertModel<typeof schema.messages>;
type InsertFeedback = InferInsertModel<typeof schema.feedback>;
type InsertNoteTag = InferInsertModel<typeof schema.notesTags>;
type InsertBookmarkTag = InferInsertModel<typeof schema.bookmarksTags>;
type InsertTaskTag = InferInsertModel<typeof schema.tasksTags>;
type InsertDocumentTag = InferInsertModel<typeof schema.documentsTags>;

type Database =
  | PostgresJsDatabase<typeof pgSchema>
  | PgliteDatabase<typeof pgSchema>
  | BetterSQLite3Database<typeof sqliteSchema>;

// --- Helper Functions ---
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function computeApiKeyHash(fullKey: string): {
  keyHash: string;
  hashVersion: number;
} {
  // Use the HMAC key from config (single source of truth)
  const pepperKey = config.security.apiKeyHmacKeyV1;

  if (!pepperKey) {
    throw new Error(
      "API key HMAC key not available. Config should provide this based on NODE_ENV.",
    );
  }

  const keyHash = hmacBase64(fullKey, pepperKey);
  const hashVersion = parseInt(config.security.apiKeyHmacVersion, 10);
  return { keyHash, hashVersion };
}

// --- Fixed Test API Keys (Development/Testing Only) ---
// These values are pre-calculated and NEVER change
// They are for testing only and should NEVER be used in production
const FIXED_TEST_KEYS = {
  // Demo user API keys (15 char keyId, 32 char secret)
  demoUser1: {
    fullKey: "sk-DEVONLYUSER0001-DEVONLY2222222222222222222222222",
    keyId: "DEVONLYUSER0001",
    keySuffix: "2222",
  },
  demoUser2: {
    fullKey: "sk-DEVONLYUSER0002-DEVONLY3333333333333333333333333",
    keyId: "DEVONLYUSER0002",
    keySuffix: "3333",
  },
};

// --- Constants ---

const DEMO_USER1_ID = "user-demo-1";
const DEMO_USER1_EMAIL = "demo@example.com";
const DEMO_USER1_PASSWORD = "Demo@123";

const DEMO_USER2_ID = "user-demo-2";
const DEMO_USER2_EMAIL = "demo2@example.com";
const DEMO_USER2_PASSWORD = "Demo2@123";

const ADMIN_USER_ID = "user-adm-demo-1";
const ADMIN_USER_EMAIL = "admin@example.com";
const ADMIN_USER_PASSWORD = "Admin@123";

// --- Main Seeding Function ---
async function main() {
  const args = process.argv.slice(2);
  const demo = args.includes("--demo");

  // Determine what to seed:
  // - Default: Nothing (AI assistant created by migration)
  // - --demo: Demo users (admin, demo1, demo2) with accounts and API keys
  if (!demo) {
    console.log("[INFO] No seeding required.");
    console.log("   AI assistant user is created by migration.");
    console.log("   Use --demo to seed demo users for testing.");
    return;
  }

  console.log("[SEED] Seeding database with demo users...");

  let db: Database;
  let cleanup: () => Promise<void>;

  if (dbType === "sqlite") {
    // SQLite setup using client helper
    const sqlitePath = getSqlitePath();
    console.log(`Connecting to SQLite database: ${sqlitePath}`);

    const client = createSqliteClient(sqlitePath);
    db = drizzleSqlite(client, { schema: sqliteSchema }) as Database;
    cleanup = async () => {
      client.close();
    };
  } else if (dbType === "pglite") {
    // PGlite setup using client helper
    const pglitePath = getPGlitePath();
    console.log(`Connecting to PGlite database: ${pglitePath}`);

    const client = createPgliteClient(pglitePath);
    db = drizzlePglite(client, { schema: pgSchema }) as Database;
    cleanup = async () => {
      await client.close();
    };
  } else {
    // PostgreSQL setup using client helper
    const dbUrl = process.env.DATABASE_URL || getDatabaseUrl();
    if (!dbUrl) {
      throw new Error(
        `DATABASE_URL is required for PostgreSQL seeding but was not provided. ` +
          `Either set DATABASE_URL or ensure DATABASE_TYPE=postgres.`,
      );
    }
    console.log(
      `Connecting to PostgreSQL database: ${dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? "local" : "remote"}`,
    );

    const client = createPostgresClient(dbUrl);
    db = drizzlePostgres(client, { schema: pgSchema }) as Database;
    cleanup = async () => {
      await client.end();
    };
  }

  try {
    // Use current timestamp - with mode: 'timestamp_ms', all databases expect Date objects
    const now = new Date();

    // 1. Create Demo Users
    console.log("[USERS] Creating demo users...");

    const demoUsersData: InsertUser[] = [
      {
        id: ADMIN_USER_ID,
        userType: "user",
        email: ADMIN_USER_EMAIL,
        displayName: "Admin User",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: DEMO_USER1_ID,
        userType: "user",
        email: DEMO_USER1_EMAIL,
        displayName: "Demo User 1",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: DEMO_USER2_ID,
        userType: "user",
        email: DEMO_USER2_EMAIL,
        displayName: "Demo User 2",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any)
      .insert(schema.users)
      .values(demoUsersData)
      .onConflictDoNothing();
    console.log(`-> ${demoUsersData.length} demo users ensured.`);

    // 2. Create Demo Accounts
    console.log("[AUTH] Creating demo accounts...");

    const demoAccountsData: InsertAccount[] = [
      {
        accountId: ADMIN_USER_EMAIL,
        providerId: "credential",
        userId: ADMIN_USER_ID,
        passwordHash: await hashPassword(ADMIN_USER_PASSWORD),
        createdAt: now,
        updatedAt: now,
      },
      {
        accountId: DEMO_USER1_EMAIL,
        providerId: "credential",
        userId: DEMO_USER1_ID,
        passwordHash: await hashPassword(DEMO_USER1_PASSWORD),
        createdAt: now,
        updatedAt: now,
      },
      {
        accountId: DEMO_USER2_EMAIL,
        providerId: "credential",
        userId: DEMO_USER2_ID,
        passwordHash: await hashPassword(DEMO_USER2_PASSWORD),
        createdAt: now,
        updatedAt: now,
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any)
      .insert(schema.accounts)
      .values(demoAccountsData)
      .onConflictDoNothing();
    console.log(`-> ${demoAccountsData.length} demo accounts ensured.`);

    // 3. Create Demo API Keys
    console.log("[AUTH] Creating demo API keys...");

    const demoUser1Hash = computeApiKeyHash(FIXED_TEST_KEYS.demoUser1.fullKey);
    const demoUser2Hash = computeApiKeyHash(FIXED_TEST_KEYS.demoUser2.fullKey);

    const demoApiKeysData: InsertApiKey[] = [
      {
        keyId: FIXED_TEST_KEYS.demoUser1.keyId,
        keyHash: demoUser1Hash.keyHash,
        hashVersion: demoUser1Hash.hashVersion,
        keySuffix: FIXED_TEST_KEYS.demoUser1.keySuffix,
        userId: DEMO_USER1_ID,
        name: "Demo User Test API Key",
        createdAt: now,
      },
      {
        keyId: FIXED_TEST_KEYS.demoUser2.keyId,
        keyHash: demoUser2Hash.keyHash,
        hashVersion: demoUser2Hash.hashVersion,
        keySuffix: FIXED_TEST_KEYS.demoUser2.keySuffix,
        userId: DEMO_USER2_ID,
        name: "Demo User 2 Test API Key",
        createdAt: now,
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any)
      .insert(schema.apiKeys)
      .values(demoApiKeysData)
      .onConflictDoNothing();
    console.log(`-> ${demoApiKeysData.length} demo API keys ensured.`);

    // 4. Create Tags for Demo User
    console.log("[TAGS] Creating demo tags...");

    const demoTagsData: InsertTag[] = [
      { id: "tag-demo-ai-001", name: "ai", userId: DEMO_USER1_ID },
      { id: "tag-demo-product-001", name: "product", userId: DEMO_USER1_ID },
      { id: "tag-demo-research-001", name: "research", userId: DEMO_USER1_ID },
      { id: "tag-demo-dev-001", name: "dev", userId: DEMO_USER1_ID },
      { id: "tag-demo-ideas-001", name: "ideas", userId: DEMO_USER1_ID },
      { id: "tag-demo-reading-001", name: "reading", userId: DEMO_USER1_ID },
      { id: "tag-demo-finance-001", name: "finance", userId: DEMO_USER1_ID },
      { id: "tag-demo-music-001", name: "music", userId: DEMO_USER1_ID },
      { id: "tag-demo-youtube-001", name: "youtube", userId: DEMO_USER1_ID },
      { id: "tag-demo-news-001", name: "news", userId: DEMO_USER1_ID },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.tags).values(demoTagsData).onConflictDoNothing();
    console.log(`-> ${demoTagsData.length} demo tags ensured.`);

    // 5. Create Notes for Demo User
    console.log("[NOTES] Creating demo notes...");

    const demoNotesData: InsertNote[] = [
      {
        id: "note-demo-00000000001",
        userId: DEMO_USER1_ID,
        title: "Weekly Review — Week 7",
        content: `## What went well\n\n- Shipped the knowledge graph integration with Neo4j\n- Got positive feedback on the new AI assistant interface\n- Figured out the embedding model switch (text-embedding-3-small is much faster)\n\n## What could improve\n\n- Spent too much time debugging Docker networking issues\n- Need to document the Graphiti integration better\n- Should batch more tasks instead of context-switching\n\n## Focus for next week\n\n1. Record demo video for Product Hunt\n2. Write blog post about the graph-powered approach\n3. Set up CI/CD pipeline properly`,
        isPinned: true,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      },
      {
        id: "note-demo-00000000002",
        userId: DEMO_USER1_ID,
        title: "LLM Context Window Research",
        content: `## Context Window Sizes (Feb 2026)\n\n| Model | Context Window | Notes |\n|-------|---------------|-------|\n| GPT-4o | 128k tokens | Best for complex tasks |\n| Claude 3.5 Sonnet | 200k tokens | Great at long docs |\n| Gemini 1.5 Pro | 1M tokens | Experimental |\n| Llama 3.1 70B | 128k tokens | Open weights |\n\n## Implications for Cortex\n\n- Can fit ~50 knowledge graph facts in context easily\n- For bulk operations, need chunking strategy\n- Consider using Claude for document analysis due to longer context`,
        flagColor: "yellow",
        createdAt: daysAgo(5),
        updatedAt: daysAgo(3),
      },
      {
        id: "note-demo-00000000003",
        userId: DEMO_USER1_ID,
        title: "Product Hunt Launch Checklist",
        content: `## Pre-Launch\n\n- [x] Create demo video (60 seconds)\n- [x] Write tagline and description\n- [ ] Prepare maker comment\n- [ ] Schedule social posts\n- [ ] Notify email list\n\n## Assets Needed\n\n- Logo (240x240)\n- Gallery images (1270x760)\n- GIF preview\n- Thumbnail\n\n## Launch Day\n\n- Post at 12:01 AM PST\n- Monitor comments\n- Respond to questions quickly\n- Share on Twitter/LinkedIn`,
        isPinned: true,
        createdAt: daysAgo(7),
        updatedAt: daysAgo(1),
      },
      {
        id: "note-demo-00000000004",
        userId: DEMO_USER1_ID,
        title: "Graph Database Comparison",
        content: `## Neo4j\n\n**Pros:**\n- Mature ecosystem\n- Excellent visual browser at localhost:7474\n- Bolt protocol is fast\n- APOC library has everything\n\n**Cons:**\n- Enterprise features are expensive\n- Memory heavy for large graphs\n\n## FalkorDB\n\n**Pros:**\n- Redis-based, familiar ops\n- Very fast for small graphs\n- Good for edge computing\n\n**Cons:**\n- Less mature tooling\n- No visual browser\n\n## Decision: Neo4j\n\nWent with Neo4j for the visual browser alone. Being able to explore the knowledge graph visually is essential for debugging and demos.`,
        createdAt: daysAgo(14),
        updatedAt: daysAgo(10),
      },
      {
        id: "note-demo-00000000005",
        userId: DEMO_USER1_ID,
        title: "Ideas Dump — February",
        content: `Random ideas to explore:\n\n1. **Timeline View** — Show project history as a visual timeline with commits, tasks, and conversations\n\n2. **Weekly Digest Email** — Auto-summarize what changed in the knowledge graph\n\n3. **Mobile App** — React Native version for quick capture on the go\n\n4. **Browser Extension** — One-click bookmark with auto-tagging\n\n5. **Voice Memo Ingestion** — Whisper API to transcribe and extract entities\n\n6. **Team Collaboration** — Shared graphs with permission controls\n\n7. **Export to Obsidian** — Generate markdown files from graph nodes`,
        createdAt: daysAgo(10),
        updatedAt: daysAgo(4),
      },
      {
        id: "note-demo-00000000006",
        userId: DEMO_USER1_ID,
        title: "Meeting Notes — Investor Call",
        content: `## Call with Sarah from Foundry Capital\n\n**Date:** Last Thursday\n\n**Key Points:**\n\n- She's interested in the "knowledge graph for individuals" angle\n- Asked about defensibility — explained the data network effects\n- Wants to see user traction before next conversation\n- Suggested connecting with their AI portfolio companies\n\n**Follow-ups:**\n\n- [ ] Send deck with updated metrics\n- [ ] Schedule demo once we have 100 users\n- [ ] Intro to their Notion contact`,
        flagColor: "blue",
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        id: "note-demo-00000000007",
        userId: DEMO_USER1_ID,
        title: "API Design Principles",
        content: `## Cortex API Guidelines\n\n### Resource Naming\n\n- Use plural nouns: \`/api/tasks\`, \`/api/bookmarks\`\n- Nested resources for relationships: \`/api/tasks/:id/comments\`\n- Use query params for filtering: \`?status=completed&tag=dev\`\n\n### Response Format\n\n- Always return JSON\n- Include \`id\`, \`createdAt\`, \`updatedAt\` on all resources\n- Paginate with \`limit\` and \`offset\`\n- Return 201 for created, 204 for deleted\n\n### Error Handling\n\n- Use appropriate HTTP status codes\n- Return \`{ error: { message, code } }\` shape\n- Log errors server-side with request ID`,
        createdAt: daysAgo(20),
        updatedAt: daysAgo(8),
      },
      {
        id: "note-demo-00000000008",
        userId: DEMO_USER1_ID,
        title: "Reading Log",
        content: `## Currently Reading\n\n- **Building a Second Brain** by Tiago Forte — Great framework for personal knowledge management\n- **The Mom Test** by Rob Fitzpatrick — Re-reading for user research\n\n## Recently Finished\n\n- **Working in Public** by Nadia Eghbal — Open source community dynamics\n- **Shape Up** by Basecamp — Their product development methodology\n\n## On the List\n\n- Designing Data-Intensive Applications\n- The Hard Thing About Hard Things\n- Zero to One`,
        createdAt: daysAgo(30),
        updatedAt: daysAgo(2),
      },
      {
        id: "note-demo-00000000009",
        userId: DEMO_USER1_ID,
        title: "Crypto Portfolio Watchlist",
        content: `## Current Holdings\n\n| Coin | Allocation | Entry Price | Strategy |\n|------|-----------|------------|----------|\n| BTC | 40% | $42,000 | Long-term hold |\n| ETH | 30% | $2,800 | Stake for yield |\n| SOL | 15% | $95 | Active trading |\n| ADA | 10% | $0.58 | Accumulate |\n| LINK | 5% | $14.50 | Oracle thesis |\n\n## Watchlist\n\n- **SUI** — Move-based L1, strong DeFi ecosystem\n- **TIA** — Modular blockchain thesis\n- **RNDR** — GPU rendering network\n\n## Notes\n\n- Rebalance quarterly\n- DCA into BTC on red days\n- Set stop-losses on SOL below $160\n- CoinGecko API is free for price tracking`,
        isPinned: true,
        flagColor: "green",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(1),
      },
      {
        id: "note-demo-00000000010",
        userId: DEMO_USER1_ID,
        title: "Music Discovery — Ambient & Electronic",
        content: `## Weekly Rotation\n\n### Deep Focus\n- Bonobo — "Migration" (perfect for coding sessions)\n- Tycho — "Dive" (warm analog synths)\n- Kiasmos — "Blurred" (minimal techno meets classical)\n\n### Upbeat Work\n- Khruangbin — "Con Todo El Mundo" (Thai funk vibes)\n- Tame Impala — "Currents" (psychedelic pop)\n- M83 — "Hurry Up, We're Dreaming" (epic synth)\n\n### Chill Evening\n- Masego & FKJ — "Tadow" (jazzy lofi)\n- Nujabes — "Metaphorical Music" (lo-fi hip hop pioneer)\n- Nils Frahm — "All Melody" (prepared piano + synths)\n\n## Spotify Playlists\n\n- Connected my Spotify for recently played tracking\n- Love the algorithmic recommendations from Discover Weekly\n- Want to build a music taste graph in Neo4j eventually`,
        createdAt: daysAgo(6),
        updatedAt: daysAgo(2),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.notes).values(demoNotesData).onConflictDoNothing();
    console.log(`-> ${demoNotesData.length} demo notes ensured.`);

    // 6. Create Bookmarks for Demo User
    console.log("[BOOKMARKS] Creating demo bookmarks...");

    const demoBookmarksData: InsertBookmark[] = [
      {
        id: "bm-demo-000000000001",
        userId: DEMO_USER1_ID,
        originalUrl: "https://graphiti.dev/docs",
        normalizedUrl: "graphiti.dev/docs",
        title: "Graphiti Documentation",
        description: "Official documentation for Graphiti temporal knowledge graphs",
        extractedText: "Graphiti is a library for building temporal knowledge graphs. It supports automatic entity extraction, relationship inference, and temporal reasoning.",
        isPinned: true,
        createdAt: daysAgo(12),
        updatedAt: daysAgo(5),
      },
      {
        id: "bm-demo-000000000002",
        userId: DEMO_USER1_ID,
        originalUrl: "https://neo4j.com/docs/getting-started/",
        normalizedUrl: "neo4j.com/docs/getting-started",
        title: "Neo4j Getting Started Guide",
        description: "Official Neo4j documentation for beginners",
        extractedText: "Neo4j is a native graph database platform built to leverage data relationships. This guide covers installation, Cypher queries, and the Neo4j Browser.",
        createdAt: daysAgo(14),
        updatedAt: daysAgo(10),
      },
      {
        id: "bm-demo-000000000003",
        userId: DEMO_USER1_ID,
        originalUrl: "https://platform.openai.com/docs",
        normalizedUrl: "platform.openai.com/docs",
        title: "OpenAI API Reference",
        description: "Complete API documentation for GPT-4, embeddings, and more",
        extractedText: "The OpenAI API provides access to GPT-4o, text embeddings, image generation, and fine-tuning capabilities. Authentication uses API keys.",
        flagColor: "blue",
        createdAt: daysAgo(20),
        updatedAt: daysAgo(15),
      },
      {
        id: "bm-demo-000000000004",
        userId: DEMO_USER1_ID,
        originalUrl: "https://drizzle.team/docs",
        normalizedUrl: "drizzle.team/docs",
        title: "Drizzle ORM Documentation",
        description: "TypeScript ORM with excellent type inference",
        extractedText: "Drizzle ORM is a TypeScript ORM for SQL databases with a focus on type safety. It supports PostgreSQL, MySQL, and SQLite with zero dependencies.",
        createdAt: daysAgo(25),
        updatedAt: daysAgo(20),
      },
      {
        id: "bm-demo-000000000005",
        userId: DEMO_USER1_ID,
        originalUrl: "https://hono.dev",
        normalizedUrl: "hono.dev",
        title: "Hono - Ultrafast Web Framework",
        description: "Lightweight, ultrafast web framework for the Edges",
        extractedText: "Hono is a small, simple, and ultrafast web framework for the Edges. It works on Cloudflare Workers, Fastly Compute, Deno, Bun, and Node.js.",
        createdAt: daysAgo(30),
        updatedAt: daysAgo(25),
      },
      {
        id: "bm-demo-000000000006",
        userId: DEMO_USER1_ID,
        originalUrl: "https://www.producthunt.com",
        normalizedUrl: "producthunt.com",
        title: "Product Hunt",
        description: "Platform for launching and discovering new products",
        extractedText: "Product Hunt is where product lovers share and discover the latest mobile apps, websites, and technology products.",
        isPinned: true,
        createdAt: daysAgo(15),
        updatedAt: daysAgo(5),
      },
      {
        id: "bm-demo-000000000007",
        userId: DEMO_USER1_ID,
        originalUrl: "https://www.anthropic.com/research",
        normalizedUrl: "anthropic.com/research",
        title: "Anthropic Research",
        description: "AI safety research and Claude model updates",
        extractedText: "Anthropic is an AI safety company focused on building reliable, interpretable, and steerable AI systems. Claude is their AI assistant.",
        flagColor: "yellow",
        createdAt: daysAgo(8),
        updatedAt: daysAgo(3),
      },
      {
        id: "bm-demo-000000000008",
        userId: DEMO_USER1_ID,
        originalUrl: "https://every.to",
        normalizedUrl: "every.to",
        title: "Every - AI Essays and Tools",
        description: "Essays about AI, productivity, and startups",
        extractedText: "Every is a bundle of newsletters and tools for curious people. Topics include AI applications, productivity systems, and startup insights.",
        createdAt: daysAgo(10),
        updatedAt: daysAgo(7),
      },
      {
        id: "bm-demo-000000000009",
        userId: DEMO_USER1_ID,
        originalUrl: "https://simonwillison.net",
        normalizedUrl: "simonwillison.net",
        title: "Simon Willison's Weblog",
        description: "Deep dives on LLMs, Python, and data tools",
        extractedText: "Simon Willison writes about large language models, datasette, and developer tools. His LLM experiments are particularly insightful.",
        createdAt: daysAgo(5),
        updatedAt: daysAgo(2),
      },
      {
        id: "bm-demo-000000000010",
        userId: DEMO_USER1_ID,
        originalUrl: "https://linear.app",
        normalizedUrl: "linear.app",
        title: "Linear - Project Management",
        description: "Modern issue tracking and project management",
        extractedText: "Linear is a streamlined project management tool built for modern software teams. Features include keyboard shortcuts, cycles, and GitHub integration.",
        createdAt: daysAgo(18),
        updatedAt: daysAgo(12),
      },
      {
        id: "bm-demo-000000000011",
        userId: DEMO_USER1_ID,
        originalUrl: "https://www.coingecko.com/en/api/documentation",
        normalizedUrl: "coingecko.com/en/api/documentation",
        title: "CoinGecko API Documentation",
        description: "Free crypto market data API — no key required",
        extractedText: "CoinGecko provides a comprehensive cryptocurrency API with real-time prices, market data, sparkline charts, and historical data. Free tier allows 30 requests per minute.",
        createdAt: daysAgo(4),
        updatedAt: daysAgo(2),
      },
      {
        id: "bm-demo-000000000012",
        userId: DEMO_USER1_ID,
        originalUrl: "https://www.youtube.com/@Fireship",
        normalizedUrl: "youtube.com/@Fireship",
        title: "Fireship — YouTube Channel",
        description: "Fast-paced tech explainers and 100 seconds of code",
        extractedText: "Fireship creates rapid-fire tech tutorials, news recaps, and the popular '100 seconds of X' format. Covers web development, AI, cloud, and developer culture.",
        isPinned: true,
        createdAt: daysAgo(6),
        updatedAt: daysAgo(1),
      },
      {
        id: "bm-demo-000000000013",
        userId: DEMO_USER1_ID,
        originalUrl: "https://techcrunch.com",
        normalizedUrl: "techcrunch.com",
        title: "TechCrunch — Tech News",
        description: "Breaking technology news and startup coverage",
        extractedText: "TechCrunch is a leading technology media property covering startups, venture capital, gadgets, and Silicon Valley. Daily news, analysis, and event coverage.",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(1),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.bookmarks).values(demoBookmarksData).onConflictDoNothing();
    console.log(`-> ${demoBookmarksData.length} demo bookmarks ensured.`);

    // 7. Create Tasks for Demo User
    console.log("[TASKS] Creating demo tasks...");

    const demoTasksData: InsertTask[] = [
      {
        id: "task-demo-0000000001",
        userId: DEMO_USER1_ID,
        title: "Set up Graphiti knowledge graph service",
        description: "Integrate Graphiti with Neo4j backend for persistent memory across AI conversations",
        status: "completed",
        completedAt: daysAgo(3),
        createdAt: daysAgo(10),
        updatedAt: daysAgo(3),
      },
      {
        id: "task-demo-0000000002",
        userId: DEMO_USER1_ID,
        title: "Write weekly review blog post",
        description: "Focus on the knowledge graph integration and lessons learned from the Neo4j migration",
        status: "in-progress",
        dueDate: daysAgo(1),
        flagColor: "orange",
        createdAt: daysAgo(5),
        updatedAt: daysAgo(1),
      },
      {
        id: "task-demo-0000000003",
        userId: DEMO_USER1_ID,
        title: "Integrate Neo4j visual browser",
        description: "Set up Neo4j Browser at localhost:7474 for graph visualization",
        status: "completed",
        completedAt: daysAgo(5),
        createdAt: daysAgo(12),
        updatedAt: daysAgo(5),
      },
      {
        id: "task-demo-0000000004",
        userId: DEMO_USER1_ID,
        title: "Design system audit",
        description: "Review and standardize the component library before v0.3 launch",
        status: "not-started",
        dueDate: daysFromNow(3),
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        id: "task-demo-0000000005",
        userId: DEMO_USER1_ID,
        title: "Review LLM provider pricing",
        description: "Compare OpenAI, Anthropic, and local Ollama options for cost optimization",
        status: "not-started",
        dueDate: daysFromNow(1),
        flagColor: "yellow",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        id: "task-demo-0000000006",
        userId: DEMO_USER1_ID,
        title: "Ship v0.3 of Cortex",
        description: "Release includes knowledge graph search, improved AI assistant, and bulk import",
        status: "in-progress",
        dueDate: daysFromNow(1),
        isPinned: true,
        flagColor: "red",
        createdAt: daysAgo(14),
        updatedAt: now,
      },
      {
        id: "task-demo-0000000007",
        userId: DEMO_USER1_ID,
        title: "Record demo video",
        description: "60-second video showcasing Cortex for Product Hunt launch",
        status: "not-started",
        dueDate: daysFromNow(5),
        createdAt: daysAgo(7),
        updatedAt: daysAgo(7),
      },
      {
        id: "task-demo-0000000008",
        userId: DEMO_USER1_ID,
        title: "Fix bookmark processing pipeline",
        description: "Timeout handling in browser automation was causing failures",
        status: "completed",
        completedAt: daysAgo(7),
        createdAt: daysAgo(14),
        updatedAt: daysAgo(7),
      },
      {
        id: "task-demo-0000000009",
        userId: DEMO_USER1_ID,
        title: "Write OpenAPI docs",
        description: "Document all API endpoints with Zod schema inference",
        status: "in-progress",
        dueDate: daysFromNow(2),
        createdAt: daysAgo(10),
        updatedAt: daysAgo(2),
      },
      {
        id: "task-demo-0000000010",
        userId: DEMO_USER1_ID,
        title: "Research vector database options",
        description: "Evaluate pgvector, Pinecone, and Qdrant for semantic search",
        status: "not-started",
        dueDate: daysFromNow(7),
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        id: "task-demo-0000000011",
        userId: DEMO_USER1_ID,
        title: "Set up CI/CD pipeline",
        description: "GitHub Actions for tests on PR, manual deploy trigger",
        status: "completed",
        completedAt: daysAgo(14),
        createdAt: daysAgo(21),
        updatedAt: daysAgo(14),
      },
      {
        id: "task-demo-0000000012",
        userId: DEMO_USER1_ID,
        title: "Email newsletter draft",
        description: "Monthly update for subscribers about Cortex progress",
        status: "not-started",
        dueDate: daysFromNow(10),
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        id: "task-demo-0000000013",
        userId: DEMO_USER1_ID,
        title: "Q1 crypto portfolio rebalance",
        description: "Review crypto allocations, check BTC/ETH ratios, update stop-losses on SOL. CoinGecko dashboard card has live data.",
        status: "not-started",
        dueDate: daysFromNow(14),
        flagColor: "green",
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.tasks).values(demoTasksData).onConflictDoNothing();
    console.log(`-> ${demoTasksData.length} demo tasks ensured.`);

    // 8. Create Task Comments
    console.log("[COMMENTS] Creating demo task comments...");

    const demoTaskCommentsData: InsertTaskComment[] = [
      {
        id: "tc-demo-000000000001",
        taskId: "task-demo-0000000006",
        userId: DEMO_USER1_ID,
        content: "Added streaming support to the AI module, need to test edge cases.",
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        id: "tc-demo-000000000002",
        taskId: "task-demo-0000000006",
        userId: DEMO_USER1_ID,
        content: "Rate limiting also needs a look before ship.",
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        id: "tc-demo-000000000003",
        taskId: "task-demo-0000000001",
        userId: DEMO_USER1_ID,
        content: "FalkorDB was tricky — switched to Neo4j for the visual browser. Much better.",
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        id: "tc-demo-000000000004",
        taskId: "task-demo-0000000009",
        userId: DEMO_USER1_ID,
        content: "Using Zod schema inference to auto-generate types from route definitions.",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        id: "tc-demo-000000000005",
        taskId: "task-demo-0000000002",
        userId: DEMO_USER1_ID,
        content: "Draft started, focusing on the knowledge graph angle.",
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        id: "tc-demo-000000000006",
        taskId: "task-demo-0000000005",
        userId: DEMO_USER1_ID,
        content: "OpenRouter looks promising as a unified gateway for multiple providers.",
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.taskComments).values(demoTaskCommentsData).onConflictDoNothing();
    console.log(`-> ${demoTaskCommentsData.length} demo task comments ensured.`);

    // 9. Create Documents (metadata only, no binary storage)
    console.log("[DOCS] Creating demo documents...");

    const demoDocumentsData: InsertDocument[] = [
      {
        id: "doc-demo-000000000001",
        userId: DEMO_USER1_ID,
        title: "Cortex Architecture Overview",
        description: "System design doc covering the monorepo structure, API layer, and worker pipeline",
        originalFilename: "cortex-architecture.md",
        extractedText: "Cortex is built as a pnpm monorepo with apps (backend, frontend) and packages (ai, core, db, logger, queue, storage). The backend uses Hono for the API layer with Drizzle ORM for database access. Background workers handle bookmark processing, OCR, and AI entity extraction.",
        createdAt: daysAgo(20),
        updatedAt: daysAgo(5),
      },
      {
        id: "doc-demo-000000000002",
        userId: DEMO_USER1_ID,
        title: "Q1 2026 Roadmap",
        description: "Feature prioritization and milestone planning for Q1",
        originalFilename: "q1-2026-roadmap.pdf",
        extractedText: "Q1 2026 Goals: 1) Launch knowledge graph integration 2) Ship mobile-responsive UI 3) Add bulk import for bookmarks 4) Implement timeline view 5) Reach 500 users. Key milestones: Jan - Neo4j integration, Feb - Product Hunt launch, Mar - Mobile app beta.",
        flagColor: "blue",
        isPinned: true,
        createdAt: daysAgo(30),
        updatedAt: daysAgo(10),
      },
      {
        id: "doc-demo-000000000003",
        userId: DEMO_USER1_ID,
        title: "LLM Evaluation Results",
        description: "Benchmark results comparing GPT-4o, Claude 3.5, and Llama 3.1 across Cortex use cases",
        originalFilename: "llm-evaluation.xlsx",
        extractedText: "Entity extraction accuracy: GPT-4o 94%, Claude 3.5 92%, Llama 3.1 87%. Latency: Llama 3.1 (local) 200ms, GPT-4o 800ms, Claude 3.5 750ms. Cost per 1M tokens: GPT-4o $5, Claude $3, Llama (Ollama) $0. Recommendation: Use GPT-4o for quality-critical extraction, Llama for high-volume batch processing.",
        createdAt: daysAgo(15),
        updatedAt: daysAgo(8),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.documents).values(demoDocumentsData).onConflictDoNothing();
    console.log(`-> ${demoDocumentsData.length} demo documents ensured.`);

    // 10. Create Tag Associations (join tables)
    console.log("[TAGS] Creating demo tag associations...");

    const demoNoteTagsData: InsertNoteTag[] = [
      { noteId: "note-demo-00000000001", tagId: "tag-demo-product-001" },
      { noteId: "note-demo-00000000001", tagId: "tag-demo-ideas-001" },
      { noteId: "note-demo-00000000002", tagId: "tag-demo-ai-001" },
      { noteId: "note-demo-00000000002", tagId: "tag-demo-research-001" },
      { noteId: "note-demo-00000000003", tagId: "tag-demo-product-001" },
      { noteId: "note-demo-00000000004", tagId: "tag-demo-dev-001" },
      { noteId: "note-demo-00000000004", tagId: "tag-demo-research-001" },
      { noteId: "note-demo-00000000005", tagId: "tag-demo-ideas-001" },
      { noteId: "note-demo-00000000006", tagId: "tag-demo-product-001" },
      { noteId: "note-demo-00000000007", tagId: "tag-demo-dev-001" },
      { noteId: "note-demo-00000000008", tagId: "tag-demo-reading-001" },
      { noteId: "note-demo-00000000009", tagId: "tag-demo-finance-001" },
      { noteId: "note-demo-00000000009", tagId: "tag-demo-research-001" },
      { noteId: "note-demo-00000000010", tagId: "tag-demo-music-001" },
      { noteId: "note-demo-00000000010", tagId: "tag-demo-ideas-001" },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.notesTags).values(demoNoteTagsData).onConflictDoNothing();

    const demoBookmarkTagsData: InsertBookmarkTag[] = [
      { bookmarkId: "bm-demo-000000000001", tagId: "tag-demo-ai-001" },
      { bookmarkId: "bm-demo-000000000001", tagId: "tag-demo-dev-001" },
      { bookmarkId: "bm-demo-000000000002", tagId: "tag-demo-dev-001" },
      { bookmarkId: "bm-demo-000000000003", tagId: "tag-demo-ai-001" },
      { bookmarkId: "bm-demo-000000000004", tagId: "tag-demo-dev-001" },
      { bookmarkId: "bm-demo-000000000005", tagId: "tag-demo-dev-001" },
      { bookmarkId: "bm-demo-000000000006", tagId: "tag-demo-product-001" },
      { bookmarkId: "bm-demo-000000000007", tagId: "tag-demo-ai-001" },
      { bookmarkId: "bm-demo-000000000007", tagId: "tag-demo-research-001" },
      { bookmarkId: "bm-demo-000000000008", tagId: "tag-demo-reading-001" },
      { bookmarkId: "bm-demo-000000000008", tagId: "tag-demo-ai-001" },
      { bookmarkId: "bm-demo-000000000009", tagId: "tag-demo-reading-001" },
      { bookmarkId: "bm-demo-000000000009", tagId: "tag-demo-ai-001" },
      { bookmarkId: "bm-demo-000000000010", tagId: "tag-demo-product-001" },
      { bookmarkId: "bm-demo-000000000011", tagId: "tag-demo-finance-001" },
      { bookmarkId: "bm-demo-000000000011", tagId: "tag-demo-dev-001" },
      { bookmarkId: "bm-demo-000000000012", tagId: "tag-demo-youtube-001" },
      { bookmarkId: "bm-demo-000000000012", tagId: "tag-demo-dev-001" },
      { bookmarkId: "bm-demo-000000000013", tagId: "tag-demo-news-001" },
      { bookmarkId: "bm-demo-000000000013", tagId: "tag-demo-reading-001" },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.bookmarksTags).values(demoBookmarkTagsData).onConflictDoNothing();

    const demoTaskTagsData: InsertTaskTag[] = [
      { taskId: "task-demo-0000000001", tagId: "tag-demo-dev-001" },
      { taskId: "task-demo-0000000001", tagId: "tag-demo-ai-001" },
      { taskId: "task-demo-0000000002", tagId: "tag-demo-product-001" },
      { taskId: "task-demo-0000000003", tagId: "tag-demo-dev-001" },
      { taskId: "task-demo-0000000004", tagId: "tag-demo-product-001" },
      { taskId: "task-demo-0000000005", tagId: "tag-demo-ai-001" },
      { taskId: "task-demo-0000000005", tagId: "tag-demo-research-001" },
      { taskId: "task-demo-0000000006", tagId: "tag-demo-dev-001" },
      { taskId: "task-demo-0000000006", tagId: "tag-demo-product-001" },
      { taskId: "task-demo-0000000007", tagId: "tag-demo-product-001" },
      { taskId: "task-demo-0000000008", tagId: "tag-demo-dev-001" },
      { taskId: "task-demo-0000000009", tagId: "tag-demo-dev-001" },
      { taskId: "task-demo-0000000010", tagId: "tag-demo-ai-001" },
      { taskId: "task-demo-0000000010", tagId: "tag-demo-research-001" },
      { taskId: "task-demo-0000000011", tagId: "tag-demo-dev-001" },
      { taskId: "task-demo-0000000012", tagId: "tag-demo-product-001" },
      { taskId: "task-demo-0000000013", tagId: "tag-demo-finance-001" },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.tasksTags).values(demoTaskTagsData).onConflictDoNothing();

    const demoDocumentTagsData: InsertDocumentTag[] = [
      { documentId: "doc-demo-000000000001", tagId: "tag-demo-dev-001" },
      { documentId: "doc-demo-000000000002", tagId: "tag-demo-product-001" },
      { documentId: "doc-demo-000000000003", tagId: "tag-demo-ai-001" },
      { documentId: "doc-demo-000000000003", tagId: "tag-demo-research-001" },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.documentsTags).values(demoDocumentTagsData).onConflictDoNothing();
    console.log(`-> Tag associations ensured.`);

    // 11. Create Conversations
    console.log("[CONVERSATIONS] Creating demo conversations...");

    const demoConversationsData: InsertConversation[] = [
      {
        id: "conv-demo-00000000001",
        userId: DEMO_USER1_ID,
        title: "Graphiti Integration Help",
        messageCount: 4,
        lastMessageAt: daysAgo(3),
        createdAt: daysAgo(5),
        updatedAt: daysAgo(3),
      },
      {
        id: "conv-demo-00000000002",
        userId: DEMO_USER1_ID,
        title: "Weekly Review Brainstorm",
        messageCount: 3,
        lastMessageAt: daysAgo(1),
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      },
      {
        id: "conv-demo-00000000003",
        userId: DEMO_USER1_ID,
        title: "LLM Pricing Comparison",
        messageCount: 4,
        lastMessageAt: daysAgo(4),
        createdAt: daysAgo(6),
        updatedAt: daysAgo(4),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.conversations).values(demoConversationsData).onConflictDoNothing();
    console.log(`-> ${demoConversationsData.length} demo conversations ensured.`);

    // 12. Create Messages
    console.log("[MESSAGES] Creating demo messages...");

    const demoMessagesData: InsertMessage[] = [
      // Conversation 1: Graphiti Integration Help
      {
        id: "msg-demo-000000000001",
        conversationId: "conv-demo-00000000001",
        role: "user",
        content: "How do I integrate Graphiti with my existing Cortex backend? I want to add persistent memory for the AI assistant.",
        createdAt: daysAgo(5),
      },
      {
        id: "msg-demo-000000000002",
        conversationId: "conv-demo-00000000001",
        role: "assistant",
        content: "To integrate Graphiti with Cortex:\n\n1. Add Neo4j to your Docker Compose file with ports 7474 and 7687\n2. Set up the Graphiti Python service that wraps graphiti-core\n3. Create an HTTP client in your backend to call the Graphiti REST API\n4. Use `addMessages()` to ingest conversations and `search()` to retrieve relevant facts\n\nThe key is using the user ID as the `group_id` parameter to partition data per user.",
        createdAt: daysAgo(5),
      },
      {
        id: "msg-demo-000000000003",
        conversationId: "conv-demo-00000000001",
        role: "user",
        content: "What about idempotency? I don't want duplicate entities if I re-ingest the same content.",
        createdAt: daysAgo(4),
      },
      {
        id: "msg-demo-000000000004",
        conversationId: "conv-demo-00000000001",
        role: "assistant",
        content: "Graphiti handles deduplication through:\n\n1. **Episode UUIDs** — Each episode has a unique ID. Re-sending the same UUID is a no-op.\n2. **Entity resolution** — The LLM identifies if an entity already exists based on name and context.\n3. **Fact merging** — Contradictory facts are resolved using temporal validity (`valid_at`, `invalid_at`).\n\nFor Cortex, generate a deterministic UUID from the message ID (e.g., `msg-${messageId}`) so re-runs are safe.",
        createdAt: daysAgo(3),
      },
      // Conversation 2: Weekly Review Brainstorm
      {
        id: "msg-demo-000000000005",
        conversationId: "conv-demo-00000000002",
        role: "user",
        content: "Help me brainstorm topics for my weekly review blog post. I shipped the knowledge graph integration this week.",
        createdAt: daysAgo(2),
      },
      {
        id: "msg-demo-000000000006",
        conversationId: "conv-demo-00000000002",
        role: "assistant",
        content: "Here are some angles for your post:\n\n**Technical Deep Dive:**\n- Why you chose Neo4j over other graph databases\n- The architecture of Graphiti and how it extracts entities\n- Lessons learned from the FalkorDB to Neo4j migration\n\n**Product Narrative:**\n- The vision of a \"second brain\" with persistent memory\n- Demo of the AI assistant remembering past conversations\n- How graph-based retrieval differs from vector search\n\n**Building in Public:**\n- Challenges you faced and how you solved them\n- What's next on the roadmap\n- Metrics and user feedback so far",
        createdAt: daysAgo(2),
      },
      {
        id: "msg-demo-000000000007",
        conversationId: "conv-demo-00000000002",
        role: "user",
        content: "I like the technical angle. Can you draft an outline focusing on the Neo4j choice?",
        createdAt: daysAgo(1),
      },
      // Conversation 3: LLM Pricing Comparison
      {
        id: "msg-demo-000000000008",
        conversationId: "conv-demo-00000000003",
        role: "user",
        content: "Compare the pricing of OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, and running Llama 3.1 locally via Ollama.",
        createdAt: daysAgo(6),
      },
      {
        id: "msg-demo-000000000009",
        conversationId: "conv-demo-00000000003",
        role: "assistant",
        content: "**LLM Pricing Comparison (Feb 2026)**\n\n| Model | Input (1M tokens) | Output (1M tokens) | Notes |\n|-------|-------------------|--------------------|----|----|\n| GPT-4o | $2.50 | $10.00 | Best for complex reasoning |\n| GPT-4o-mini | $0.15 | $0.60 | Good balance of cost/quality |\n| Claude 3.5 Sonnet | $3.00 | $15.00 | Longer context (200k) |\n| Llama 3.1 70B (Ollama) | $0 | $0 | Requires local GPU |\n\n**Recommendation:** Use GPT-4o-mini for entity extraction (high volume, good accuracy) and GPT-4o for complex queries.",
        createdAt: daysAgo(6),
      },
      {
        id: "msg-demo-000000000010",
        conversationId: "conv-demo-00000000003",
        role: "user",
        content: "What about using OpenRouter as a unified gateway?",
        createdAt: daysAgo(5),
      },
      {
        id: "msg-demo-000000000011",
        conversationId: "conv-demo-00000000003",
        role: "assistant",
        content: "OpenRouter is a great option! Benefits:\n\n1. **Single API** — One endpoint for GPT-4, Claude, Llama, Mistral, etc.\n2. **Automatic fallback** — If one provider is down, it routes to another\n3. **Pay-per-use** — No commitments, use any model\n4. **Transparent pricing** — Shows the actual provider cost plus small margin\n\nFor Cortex, you could use OpenRouter for production diversity while keeping Ollama for development. Just swap the base URL and API key.",
        createdAt: daysAgo(4),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.messages).values(demoMessagesData).onConflictDoNothing();
    console.log(`-> ${demoMessagesData.length} demo messages ensured.`);

    // 13. Create Feedback
    console.log("[FEEDBACK] Creating demo feedback...");

    const demoFeedbackData: InsertFeedback[] = [
      {
        id: "fb-demo-000000000001",
        userId: DEMO_USER1_ID,
        description: "The knowledge graph search is incredibly fast. Really impressed with how it surfaces relevant context.",
        sentiment: "positive",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        id: "fb-demo-000000000002",
        userId: DEMO_USER1_ID,
        description: "Would love to see a timeline view for project history. Being able to visualize changes over time would be powerful.",
        sentiment: "positive",
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ];

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any).insert(schema.feedback).values(demoFeedbackData).onConflictDoNothing();
    console.log(`-> ${demoFeedbackData.length} demo feedback ensured.`);

    // 14. Update Demo User Profile
    console.log("[PROFILE] Updating demo user profile...");

    // biome-ignore lint/suspicious/noExplicitAny: union type has incompatible insert signatures
    await (db as any)
      .update(schema.users)
      .set({
        displayName: "Demo User",
        bio: "Building in public. Product × AI × design.",
        timezone: "America/New_York",
        city: "New York",
        country: "US",
        updatedAt: now,
      })
      .where(eq(schema.users.id, DEMO_USER1_ID));
    console.log(`-> Demo user profile updated.`);

    // 15. Log Success & Credentials
    console.log("\n[OK] Demo seeding completed successfully!");
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║               DEMO CREDENTIALS                          ║");
    console.log("╠════════════════════════════════════════════════════════╣");
    console.log(`║  Demo Login:  ${DEMO_USER1_EMAIL.padEnd(20)} / ${DEMO_USER1_PASSWORD.padEnd(12)}║`);
    console.log(`║  Admin Login: ${ADMIN_USER_EMAIL.padEnd(20)} / ${ADMIN_USER_PASSWORD.padEnd(12)}║`);
    console.log("╠════════════════════════════════════════════════════════╣");
    console.log(`║  API Key: ${FIXED_TEST_KEYS.demoUser1.fullKey.substring(0, 40)}...  ║`);
    console.log("╠════════════════════════════════════════════════════════╣");
    console.log("║  Content Seeded:                                        ║");
    console.log("║    • 10 tags                                            ║");
    console.log("║    • 10 notes                                           ║");
    console.log("║    • 13 bookmarks                                       ║");
    console.log("║    • 13 tasks (with 6 comments)                         ║");
    console.log("║    • 3 documents                                        ║");
    console.log("║    • 3 conversations (11 messages)                      ║");
    console.log("║    • 2 feedback entries                                 ║");
    console.log("╚════════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("[ERROR] Seeding failed:", error);
    process.exit(1);
  } finally {
    console.log("Closing database connection.");
    await cleanup();
  }
}

// --- Execute Main Function ---
main();
