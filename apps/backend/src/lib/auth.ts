// lib/auth.ts

import { generateSecurityId, generateUserId } from "@cortex/core";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { config } from "../config/index.js";
import { db, dbType, schema } from "../db/index.js"; // Your drizzle database instance and conditional schema
import { createChildLogger } from "./logger.js";
import { deleteQueueJobsByUserId } from "./services/user-data.js";
import { graphitiClient } from "./graphiti/index.js";

const logger = createChildLogger("auth");

logger.info({}, "Initializing Better Auth configuration");
logger.debug(
  {
    dbLoaded: !!db,
    schemaLoaded: !!schema,
  },
  "DB and schema loading status",
);

// biome-ignore lint/suspicious/noImplicitAnyLet: type inferred from drizzleAdapter call
let initializedAdapter;
try {
  if (
    !db ||
    !schema ||
    !schema.users ||
    !schema.sessions ||
    !schema.accounts ||
    !schema.verifications
  ) {
    logger.error(
      {
        dbLoaded: !!db,
        schemaLoaded: !!schema,
        usersLoaded: !!schema?.users,
        sessionsLoaded: !!schema?.sessions,
        accountsLoaded: !!schema?.accounts,
        verificationsLoaded: !!schema?.verifications,
      },
      "Critical: DB or schema parts are undefined. Adapter initialization will likely fail",
    );
    throw new Error("DB or schema not properly loaded for Drizzle adapter.");
  }
  // Determine the correct provider based on database type
  const provider = dbType === "sqlite" ? "sqlite" : "pg";

  logger.info(
    { dbType, provider },
    "Configuring Drizzle adapter with provider",
  );

  initializedAdapter = drizzleAdapter(db, {
    provider: provider, // Dynamically set based on DATABASE_TYPE
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  });
  logger.info({}, "Drizzle adapter initialized successfully");
} catch (error) {
  logger.error(
    {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    },
    "ERROR initializing Drizzle adapter",
  );
  // Consider how to handle this error; perhaps throw it to stop the app
  // or set initializedAdapter to a state that 'betterAuth' can handle or will clearly show an error.
}

// --- Social / OAuth provider helpers ---
// Google is only enabled when the corresponding env vars are set.
// We build the socialProviders object dynamically so the app still boots
// without any OAuth credentials configured.
const socialProviders: Record<string, unknown> = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // "offline" gets us a refresh token so we can call Google APIs later
    accessType: "offline",
    prompt: "consent",
    // Request the scopes we need for Gmail, YouTube, Calendar, Drive
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  };
  logger.info({}, "Google OAuth provider enabled");
}

// Note: Last.fm uses API key auth (no OAuth), so no socialProvider entry needed.
// Credentials are read directly from LASTFM_API_KEY / LASTFM_USERNAME env vars.

export const auth = betterAuth({
  database: initializedAdapter, // Use the potentially try-catched adapter
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  // Only add socialProviders when at least one is configured
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false, // Disable cookie caching to ensure session is validated against DB on every request
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        // Clean up queue jobs for this user (userId stored in metadata JSON)
        await deleteQueueJobsByUserId(user.id);
        logger.info(
          { userId: user.id },
          "Cleaned up queue jobs for deleted user",
        );
        // Clean up Graphiti knowledge graph data for this user
        await graphitiClient.deleteGroup(user.id).catch((err) => {
          logger.warn({ err, userId: user.id }, "Graphiti deleteGroup failed (non-fatal)");
        });
      },
    },
    fields: {
      name: "displayName", // Map Better Auth's "name" field to our "displayName" column
    },
    additionalFields: {
      fullName: {
        type: "string",
        required: false,
      },
      userType: {
        type: "string",
        required: true,
        defaultValue: "user",
      },
    },
  },
  account: {
    fields: { password: "passwordHash" },
  },
  verification: {
    fields: { value: "token" },
  },
  // Secret is provided by config system (auto-generated in dev, required in production)
  secret: config.security.betterAuthSecret,
  //basePath: "/api/auth", // Keep this commented out as per previous advice
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000", // Docker container name
    config.services.frontendUrl,
  ],
  advanced: {
    database: {
      generateId: (options) => {
        switch (options.model) {
          case "user":
            return generateUserId();

          // Sessions, accounts, and verifications are security-sensitive.
          // Using a cryptographically secure UUID is a good practice.
          case "session":
          case "account":
          case "verification":
            return generateSecurityId();

          // A secure fallback for any other models that might be introduced.
          default:
            return generateSecurityId();
        }
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
