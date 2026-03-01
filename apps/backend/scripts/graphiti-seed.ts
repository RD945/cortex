/**
 * Graphiti Seeding Script
 *
 * Seeds the Neo4j knowledge graph with demo episodes via the Graphiti HTTP API.
 * All episodes use fixed UUIDs so the script is idempotent.
 *
 * Prerequisites:
 *   - Neo4j must be running (docker compose up neo4j)
 *   - Graphiti service must be running (docker compose up graphiti)
 *
 * Usage:
 *   pnpm seed:graphiti
 */

const GRAPHITI_API_URL =
  process.env.GRAPHITI_API_URL || "http://localhost:8765";
const DEMO_USER_GROUP_ID = "user-demo-1";

// Fixed UUIDs for idempotency
const EPISODE_UUIDS = {
  ep01: "00000000-demo-0001-0000-000000000001",
  ep02: "00000000-demo-0001-0000-000000000002",
  ep03: "00000000-demo-0001-0000-000000000003",
  ep04: "00000000-demo-0001-0000-000000000004",
  ep05: "00000000-demo-0001-0000-000000000005",
  ep06: "00000000-demo-0001-0000-000000000006",
  ep07: "00000000-demo-0001-0000-000000000007",
  ep08: "00000000-demo-0001-0000-000000000008",
  ep09: "00000000-demo-0001-0000-000000000009",
  ep10: "00000000-demo-0001-0000-000000000010",
  ep11: "00000000-demo-0001-0000-000000000011",
  ep12: "00000000-demo-0001-0000-000000000012",
  ep13: "00000000-demo-0001-0000-000000000013",
  ep14: "00000000-demo-0001-0000-000000000014",
  ep15: "00000000-demo-0001-0000-000000000015",
  ep16: "00000000-demo-0001-0000-000000000016",
  // New episodes for richer demo data
  ep17: "00000000-demo-0001-0000-000000000017",
  ep18: "00000000-demo-0001-0000-000000000018",
  ep19: "00000000-demo-0001-0000-000000000019",
  ep20: "00000000-demo-0001-0000-000000000020",
  ep21: "00000000-demo-0001-0000-000000000021",
  ep22: "00000000-demo-0001-0000-000000000022",
  ep23: "00000000-demo-0001-0000-000000000023",
  ep24: "00000000-demo-0001-0000-000000000024",
  ep25: "00000000-demo-0001-0000-000000000025",
  ep26: "00000000-demo-0001-0000-000000000026",
  ep27: "00000000-demo-0001-0000-000000000027",
  ep28: "00000000-demo-0001-0000-000000000028",
};

interface Episode {
  uuid: string;
  name: string;
  content: string;
  source_description: string;
  timestamp: string;
  role_type: 'user' | 'assistant' | 'system';
  role: string | null;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const DEMO_EPISODES: Episode[] = [
  {
    uuid: EPISODE_UUIDS.ep01,
    name: "Weekly Review — Week 7",
    content: `Alex completed the weekly review. Key wins: shipped knowledge graph integration with Neo4j, got positive feedback on new AI assistant interface, switched embedding model to text-embedding-3-small for faster performance. Areas to improve: debugging Docker networking took too long, need better Graphiti documentation. Focus for next week: record Product Hunt demo video, write blog post about graph-powered approach, set up CI/CD pipeline.`,
    source_description: "cortex_note",
    timestamp: daysAgo(2),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep02,
    name: "LLM Context Window Research",
    content: `Alex researched LLM context window sizes. GPT-4o has 128k tokens, Claude 3.5 Sonnet has 200k tokens, Gemini 1.5 Pro has 1M tokens, Llama 3.1 70B has 128k tokens. For Cortex, can fit ~50 knowledge graph facts in context easily. Bulk operations need chunking strategy. Considering Claude for document analysis due to longer context window.`,
    source_description: "cortex_note",
    timestamp: daysAgo(5),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep03,
    name: "Product Hunt Launch Planning",
    content: `Alex is preparing for Product Hunt launch. Completed: demo video 60 seconds, tagline and description. Remaining: maker comment, social posts schedule, email list notification. Assets needed: logo 240x240, gallery images 1270x760, GIF preview, thumbnail. Launch plan: post at 12:01 AM PST, monitor comments, respond quickly, share on Twitter and LinkedIn.`,
    source_description: "cortex_note",
    timestamp: daysAgo(7),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep04,
    name: "Graph Database Decision",
    content: `Alex compared graph databases. Neo4j pros: mature ecosystem, excellent visual browser at localhost:7474, fast Bolt protocol, comprehensive APOC library. Neo4j cons: expensive enterprise features, memory heavy. FalkorDB pros: Redis-based familiar ops, fast for small graphs. FalkorDB cons: less mature tooling, no visual browser. Decision: chose Neo4j for visual browser capability which is essential for debugging and demos.`,
    source_description: "cortex_note",
    timestamp: daysAgo(14),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep05,
    name: "Investor Call Notes",
    content: `Alex had a call with Sarah from Foundry Capital. Sarah is interested in "knowledge graph for individuals" angle. Asked about defensibility - Alex explained data network effects. Sarah wants to see user traction before next conversation. Suggested connecting with their AI portfolio companies. Follow-ups: send updated deck with metrics, schedule demo at 100 users, get intro to their Notion contact.`,
    source_description: "cortex_note",
    timestamp: daysAgo(4),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep06,
    name: "Graphiti Integration Discussion",
    content: `Alex discussed Graphiti integration with AI assistant. Integration steps: add Neo4j to Docker Compose with ports 7474 and 7687, set up Graphiti Python service wrapping graphiti-core, create HTTP client for Graphiti REST API, use addMessages for ingestion and search for retrieval. Key insight: use user ID as group_id parameter to partition data per user.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(5),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep07,
    name: "Idempotency in Graphiti",
    content: `Alex learned about Graphiti idempotency. Episode UUIDs make re-sending safe - same UUID is a no-op. Entity resolution by LLM identifies existing entities based on name and context. Fact merging resolves contradictions using temporal validity with valid_at and invalid_at fields. For Cortex, should generate deterministic UUID from message ID like msg-messageId format.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(4),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep08,
    name: "LLM Pricing Analysis",
    content: `Alex analyzed LLM pricing for February 2026. GPT-4o: $2.50 input, $10.00 output per 1M tokens, best for complex reasoning. GPT-4o-mini: $0.15 input, $0.60 output, good cost-quality balance. Claude 3.5 Sonnet: $3.00 input, $15.00 output, longer 200k context. Llama 3.1 70B via Ollama: $0 both, requires local GPU. Recommendation: GPT-4o-mini for entity extraction high volume, GPT-4o for complex queries.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(6),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep09,
    name: "OpenRouter Consideration",
    content: `Alex learned about OpenRouter as unified LLM gateway. Benefits: single API endpoint for GPT-4, Claude, Llama, Mistral. Automatic fallback when providers down. Pay-per-use no commitments. Transparent pricing shows actual provider cost plus margin. For Cortex, could use OpenRouter for production diversity while keeping Ollama for development by swapping base URL and API key.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(5),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep10,
    name: "Task Progress Update",
    content: `Alex's task status: completed Graphiti knowledge graph setup, completed Neo4j visual browser integration at localhost 7474, completed bookmark processing pipeline fix for timeout handling, completed CI/CD pipeline with GitHub Actions. In progress: weekly review blog post about knowledge graph, v0.3 Cortex release with graph search and improved AI assistant, OpenAPI docs with Zod schema inference.`,
    source_description: "cortex_tasks",
    timestamp: daysAgo(1),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep11,
    name: "Reading List",
    content: `Alex is currently reading Building a Second Brain by Tiago Forte for personal knowledge management framework, and rereading The Mom Test by Rob Fitzpatrick for user research. Recently finished Working in Public by Nadia Eghbal about open source communities, and Shape Up by Basecamp about product development. On reading list: Designing Data-Intensive Applications, The Hard Thing About Hard Things, Zero to One.`,
    source_description: "cortex_note",
    timestamp: daysAgo(2),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep12,
    name: "Architecture Overview",
    content: `Cortex architecture: pnpm monorepo with apps backend and frontend, packages for ai, core, db, logger, queue, storage. Backend uses Hono for API layer with Drizzle ORM for database access. Background workers handle bookmark processing, OCR, and AI entity extraction. Q1 2026 goals: knowledge graph integration, mobile-responsive UI, bulk import, timeline view, reach 500 users. Milestones: January Neo4j integration, February Product Hunt launch, March mobile app beta.`,
    source_description: "cortex_document",
    timestamp: daysAgo(5),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep13,
    name: "Crypto Portfolio Strategy",
    content: `Alex manages a crypto portfolio with specific allocations: 40% Bitcoin at entry price $42K as long-term hold, 30% Ethereum at $2800 staked for yield, 15% Solana at $95 for active trading, 10% Cardano at $0.58 accumulating, 5% Chainlink at $14.50 for oracle thesis. Watchlist includes SUI for Move-based L1, TIA for modular blockchain thesis, and RNDR for GPU rendering. Strategy: rebalance quarterly, DCA into BTC on red days, stop-losses on SOL below $160. Uses CoinGecko free API for price tracking on dashboard.`,
    source_description: "cortex_note",
    timestamp: daysAgo(3),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep14,
    name: "Music Listening Preferences",
    content: `Alex's music preferences for work: deep focus sessions use Bonobo Migration album and Tycho Dive for warm analog synths. Upbeat work uses Khruangbin Con Todo El Mundo for Thai funk and Tame Impala Currents for psychedelic pop. Evening chill includes Masego and FKJ Tadow for jazzy lofi and Nujabes Metaphorical Music. Alex connected Spotify account to Cortex for recently played tracking. Interested in building a music taste graph in Neo4j to discover patterns in listening habits. Prefers ambient electronic and lo-fi genres for coding.`,
    source_description: "cortex_note",
    timestamp: daysAgo(6),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep15,
    name: "Tech News Reading Habits",
    content: `Alex follows tech news daily through RSS feeds. Primary sources: TechCrunch for startup and venture capital coverage, The Verge for consumer tech and gadgets, Hacker News for developer community discussions. Key topics of interest: AI regulation in EU, NVIDIA earnings and GPU market, funding rounds for AI companies like Anthropic, Apple Vision Pro development, SpaceX launches, open source LLM releases like Llama 4. Uses RSS reader integrated into Cortex dashboard for zero-API-key news aggregation.`,
    source_description: "cortex_note",
    timestamp: daysAgo(1),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep16,
    name: "YouTube Content Preferences",
    content: `Alex watches YouTube for tech education and entertainment. Favorite channels: Fireship for fast-paced code tutorials and 100 Seconds series, 3Blue1Brown for math visualization especially neural network explanations, ThePrimeagen for programming hot takes and Vim tips, Andrej Karpathy for deep learning lectures and GPT internals, MKBHD for tech reviews. Also follows Y Combinator channel for startup advice. Connected Google account to Cortex for personalized YouTube feed on dashboard. Prefers 10-20 minute technical deep dives over vlogs.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(2),
    role_type: "user",
    role: "Demo User",
  },
  // ─── New Episodes: Team Conversations & Personal Context ─────────────────────
  {
    uuid: EPISODE_UUIDS.ep17,
    name: "Morning Standup with Sarah",
    content: `Alex: Hey Sarah, quick sync on the UI redesign. How's the dashboard mockup coming along?

Sarah: Good morning! I finished the Figma prototypes last night. The new card-based layout looks much cleaner. I moved the knowledge graph visualization to a dedicated tab instead of cramming it into the sidebar.

Alex: Smart call. Users were complaining the sidebar was too cluttered. Did you include the quick-add widget I mentioned?

Sarah: Yes! It's now a floating action button in the bottom-right corner. Tap once for quick note, long-press for task or bookmark. I also added haptic feedback for mobile.

Alex: Perfect. Let's review it in our Thursday design sync with Mike. He wanted to make sure the API endpoints support the new card components.

Sarah: Sounds good. I'll export the specs to Notion by tomorrow. Also, can we use the new Inter Variable font? It has better readability at small sizes.

Alex: Approved. Add it to the design system doc.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(1),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep18,
    name: "Backend Planning with Mike",
    content: `Mike: Alex, I've been looking at the Graphiti integration. The background worker is processing about 50 episodes per minute on my M1 Mac. Should be faster on the production server.

Alex: That's solid. What about the bulk import feature? Users want to import their old Notion exports.

Mike: I've got a working prototype. It parses Notion's export format, extracts the markdown, and chunks it into episodes. The tricky part is preserving the original timestamps from Notion metadata.

Alex: Critical for the knowledge graph. Facts need accurate timestamps for temporal reasoning.

Mike: Agreed. I'm using the Last Modified date from Notion. Also added support for Obsidian vault imports - they use frontmatter YAML which is easier to parse.

Alex: Excellent. Can we add Roam Research too? Sarah mentioned some beta users are coming from Roam.

Mike: Sure, but Roam uses a weird nested bullet format. I'll need another day or two.

Alex: Take your time. Quality over speed. Let's target next Wednesday for the import feature PR.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(3),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep19,
    name: "Travel Plans - Japan Trip 2026",
    content: `Alex is planning a two-week trip to Japan in April 2026 for cherry blossom season. Itinerary draft: Days 1-4 in Tokyo staying in Shinjuku near the station, visiting Shibuya Crossing, Senso-ji Temple, teamLab Borderless, and Akihabara for electronics. Days 5-7 in Kyoto at a traditional ryokan, seeing Fushimi Inari shrine at sunrise, Arashiyama bamboo grove, and Kinkaku-ji Golden Pavilion. Days 8-9 day trip to Nara for the deer park and Todai-ji temple. Days 10-12 in Osaka for street food at Dotonbori, Osaka Castle, and Universal Studios Japan. Days 13-14 back to Tokyo for Tsukiji outer market and departure. Budget estimate: $4000 including flights from SFO, JR Pass for $450, accommodations averaging $150/night, and daily food/activities at $100/day. Need to book ryokan 3 months in advance for cherry blossom season.`,
    source_description: "cortex_note",
    timestamp: daysAgo(8),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep20,
    name: "Fitness Goals and Routine",
    content: `Alex's fitness routine for Q1 2026: Monday is chest and triceps at the gym, focusing on bench press 3x8 at 185lbs working up to 225lbs, incline dumbbell press, and cable flyes. Tuesday is back and biceps with deadlifts 3x5 at 275lbs, pull-ups, and barbell rows. Wednesday is active recovery with a 30-minute zone 2 run in the neighborhood. Thursday is legs with squats 3x8 at 225lbs, Romanian deadlifts, and leg press. Friday is shoulders and abs with overhead press, lateral raises, and hanging leg raises. Saturday is a long run, building up to 10K by March for the Bay to Breakers race. Sunday is complete rest. Tracking workouts in Strong app, synced to Apple Health. Current weight: 175lbs at 5'11", goal is to reach 180lbs lean by summer. Taking creatine monohydrate 5g daily and protein shake post-workout.`,
    source_description: "cortex_note",
    timestamp: daysAgo(5),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep21,
    name: "Learning Journal - Rust Language",
    content: `Alex is learning Rust to build high-performance CLI tools. Progress so far: completed chapters 1-8 of The Rust Book covering ownership, borrowing, structs, enums, and pattern matching. Key insights: ownership system prevents memory bugs at compile time, no garbage collector means predictable performance, pattern matching with enums is incredibly powerful. Built a simple CLI file searcher called rustgrep as practice project. Next steps: learn async Rust with Tokio, build a concurrent web scraper, then attempt a Raytracer in One Weekend port. Resources: Rust by Example for hands-on practice, Jon Gjengset YouTube channel for advanced topics, Rustlings exercises for drilling concepts. Goal: be comfortable enough with Rust by Q2 to contribute to open source projects like Ruff (Python linter) or Deno.`,
    source_description: "cortex_note",
    timestamp: daysAgo(4),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep22,
    name: "Home Office Setup Notes",
    content: `Alex upgraded the home office setup in January 2026. Desk: autonomous SmartDesk Pro 2, 60x30 inches, sit-stand with memory presets at 28 inches sitting and 44 inches standing. Chair: Herman Miller Aeron size B, purchased refurbished for $800 from Crandall Office. Monitor: LG 27UK850-W 27 inch 4K IPS, mounted on Ergotron LX arm for flexible positioning. Second monitor: vertical Dell P2419H for Discord, Spotify, and terminal. Keyboard: Keychron Q1 with Gateron G Pro Brown switches, sounds great with tape mod. Mouse: Logitech MX Master 3S, paired to both MacBook and work laptop. Lighting: BenQ ScreenBar Plus for task lighting without screen glare. Audio: Bose QuietComfort 45 for focus work, Shure MV7 microphone for calls. Cable management: J Channel under desk, 1 Velcro cable tie bundle. Total investment: approximately $2500 over 6 months. Room temperature kept at 68F with a Dyson Pure Cool fan for air filtration.`,
    source_description: "cortex_note",
    timestamp: daysAgo(10),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep23,
    name: "AI Assistant Feature Brainstorm",
    content: `Alex: I want to add a new feature where the AI assistant can proactively suggest tasks based on my notes and calendar.

AI Assistant: That's an interesting idea! Based on your knowledge graph, I can see patterns in how you work. For example, you often write notes about meetings but don't always create follow-up tasks.

Alex: Exactly! If I mention "need to follow up with Sarah" in a note, the assistant should suggest creating a task.

AI Assistant: I could scan recent notes for action-oriented language like "need to", "should", "todo", "follow up", "deadline". Then surface suggestions in a daily digest or notification.

Alex: Love it. What about calendar integration?

AI Assistant: I could cross-reference your calendar with incomplete tasks. If you have a meeting with an investor tomorrow, I'd remind you about the deck you mentioned needing to update.

Alex: Add this to the roadmap. Priority: high for Q2.`,
    source_description: "cortex_conversation",
    timestamp: daysAgo(2),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep24,
    name: "Recipe Collection - Favorite Meals",
    content: `Alex's go-to recipes for meal prep: Sunday batch cooking includes Greek chicken with lemon, oregano, and garlic over rice taking 45 minutes active time. Teriyaki salmon bowls with edamame and pickled ginger are ready in 30 minutes. Vegetarian option is black bean tacos with fresh pico de gallo and guacamole. Breakfast prep is overnight oats with banana, honey, and chia seeds stored in mason jars. Quick weeknight dinner is pasta aglio e olio taking only 20 minutes with 5 ingredients. Guilty pleasure is homemade ramen with soft-boiled egg, chashu pork, and menma from the Japanese grocery. Favorite cookbook is Salt Fat Acid Heat by Samin Nosrat, learned the science of seasoning from it. Uses Paprika app to store recipes, synced across phone and iPad.`,
    source_description: "cortex_note",
    timestamp: daysAgo(6),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep25,
    name: "Podcast Subscriptions",
    content: `Alex listens to podcasts during commute and workouts. Weekly subscriptions: Lex Fridman Podcast for long-form AI and tech conversations, favorites include episodes with Andrej Karpathy and Sam Altman. Acquired podcast by Ben Gilbert and David Rosenthal for tech business deep dives, the NVIDIA episode was exceptional. Huberman Lab for science-based health optimization, especially the sleep and focus episodes. My First Million for startup ideas and business opportunities. The Tim Ferriss Show for interviews with world-class performers. Podcast player: Pocket Casts for cross-platform sync and variable speed at 1.5x for most shows, 1x for Lex Fridman. Downloads episodes overnight on Wi-Fi to save mobile data. Average listening time: 8 hours per week.`,
    source_description: "cortex_note",
    timestamp: daysAgo(7),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep26,
    name: "Budget Planning Q1 2026",
    content: `Alex's monthly budget breakdown for Q1 2026: Income from freelance consulting at $8000/month, total $24000 for the quarter. Fixed expenses: rent $2200 in San Francisco studio, utilities $150, internet $80, phone $85, health insurance $450, gym membership $50. Variable expenses: groceries $500, dining out $300, entertainment $150, transportation $100 Clipper card plus occasional Uber. Savings targets: $2000/month to index funds VTI and VXUS in Fidelity brokerage, $500/month to Bitcoin DCA on Swan Bitcoin, $500/month emergency fund building to 6 months expenses. Discretionary: $500/month for hobbies including new keyboard switches, books, and occasional tech gadgets. Using YNAB budgeting app, goal is 50/30/20 split between needs/wants/savings. Current net worth tracking: $85000 in investments, $22000 in crypto, $15000 emergency fund.`,
    source_description: "cortex_note",
    timestamp: daysAgo(9),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep27,
    name: "Side Project Ideas Brainstorm",
    content: `Alex's side project ideas for 2026, ranked by feasibility and interest: First, a CLI tool for managing dotfiles across machines using Rust, weekend project complexity. Second, a browser extension that summarizes long articles using local LLM, moderate complexity. Third, an open source alternative to Calendly with better timezone handling, 2-month project. Fourth, a Telegram bot for tracking expenses via photo receipts with OCR, 1-month project. Fifth, a knowledge graph visualization tool for Obsidian vaults, integrates well with Cortex work. Sixth, a real-time collaborative whiteboard using WebRTC and CRDTs, ambitious but good learning opportunity. Shelved ideas: another todo app (market saturated), crypto trading bot (too risky), social media scheduler (boring). Decision framework: does this teach a new skill, is there personal use case, can it become a product?`,
    source_description: "cortex_note",
    timestamp: daysAgo(11),
    role_type: "user",
    role: "Demo User",
  },
  {
    uuid: EPISODE_UUIDS.ep28,
    name: "Coffee Shop Workspace Reviews",
    content: `Alex's favorite coffee shops for remote work in San Francisco: Sightglass Coffee in SOMA has the best pour-over and large communal tables with outlets, good for 2-3 hour sessions. Ritual Coffee Roasters in the Mission has strong Wi-Fi and a chill vibe, gets crowded after 2pm. Philz Coffee on 24th Street is good for quick meetings, too loud for deep work. Four Barrel in the Mission has excellent espresso but no Wi-Fi, intentionally. Andytown in Outer Sunset is worth the trek for the Snowy Plover drink and ocean views, quiet on weekday mornings. Saint Frank on Polk has the best cortado in the city and plenty of seating. Pro tips: always scout outlets before ordering, use noise-canceling headphones, tip well if staying more than an hour, avoid peak lunch hour 12-1pm. Backup plan: San Francisco Public Library has free Wi-Fi and quiet study rooms.`,
    source_description: "cortex_note",
    timestamp: daysAgo(12),
    role_type: "user",
    role: "Demo User",
  },
];

async function checkGraphitiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GRAPHITI_API_URL}/healthcheck`);
    if (response.ok) {
      console.log("[OK] Graphiti service is healthy");
      return true;
    }
    console.error(
      `[ERROR] Graphiti health check failed: ${response.status} ${response.statusText}`
    );
    return false;
  } catch (error) {
    console.error(`[ERROR] Cannot connect to Graphiti at ${GRAPHITI_API_URL}`);
    console.error("   Make sure Neo4j and Graphiti services are running:");
    console.error("   docker compose up neo4j graphiti");
    return false;
  }
}

async function seedEpisode(episode: Episode): Promise<boolean> {
  try {
    const response = await fetch(`${GRAPHITI_API_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_id: DEMO_USER_GROUP_ID,
        messages: [
          {
            uuid: episode.uuid,
            name: episode.name,
            content: episode.content,
            role_type: episode.role_type,
            role: episode.role,
            source_description: episode.source_description,
            timestamp: episode.timestamp,
          },
        ],
      }),
    });

    if (response.ok || response.status === 409) {
      // 409 = conflict/already exists, which is fine for idempotency
      return true;
    }

    const errorText = await response.text();
    console.error(`   Failed: ${response.status} - ${errorText}`);
    return false;
  } catch (error) {
    console.error(`   Error: ${error}`);
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Graphiti Demo Seeding");
  console.log("========================\n");

  // Health check
  console.log(`Checking Graphiti at ${GRAPHITI_API_URL}...`);
  const isHealthy = await checkGraphitiHealth();

  if (!isHealthy) {
    process.exit(1);
  }

  console.log(`\nSeeding ${DEMO_EPISODES.length} episodes for ${DEMO_USER_GROUP_ID}...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [i, episode] of DEMO_EPISODES.entries()) {
    process.stdout.write(`[${i + 1}/${DEMO_EPISODES.length}] ${episode.name}... `);

    const success = await seedEpisode(episode);

    if (success) {
      console.log("[OK]");
      successCount++;
    } else {
      console.log("[FAIL]");
      failCount++;
    }

    // Small delay between requests to avoid overwhelming the service
    if (i < DEMO_EPISODES.length - 1) {
      await sleep(500);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Succeeded: ${successCount}`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount}`);
  }
  console.log("=".repeat(50));

  console.log("\nView graph in Neo4j Browser: http://localhost:7474");
  console.log("   Query: MATCH (n) RETURN n LIMIT 50\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
