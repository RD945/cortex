import { generateSecurityId } from "@cortex/core";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { config } from "../config/index.js";
import { db, schema } from "../db/index.js";
import { verifyApiKey } from "../lib/auth-utils.js";
import { createChildLogger } from "../lib/logger.js";
import type { RouteVariables } from "../types/route-variables.js";
import crypto from "node:crypto";

const logger = createChildLogger("qr-auth");

export const qrAuthRoutes = new Hono<{ Variables: RouteVariables }>();

/**
 * Sign a session token using HMAC-SHA-256, matching Better Auth's signed cookie format.
 * The result is base64-encoded and will be URL-encoded when set as a cookie.
 */
function signToken(token: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(token);
  return hmac.digest("base64");
}

/**
 * POST /api/auth/qr-login
 *
 * Accepts an API key (from QR code scan), verifies it,
 * creates a Better Auth-compatible session, and sets the session cookie.
 */
qrAuthRoutes.post("/qr-login", async (c) => {
  try {
    const body = await c.req.json();
    const apiKey = body.apiKey;

    if (!apiKey || typeof apiKey !== "string") {
      return c.json({ error: "API key is required" }, 400);
    }

    // Verify the API key
    const { isValid, userId } = await verifyApiKey(apiKey);
    if (!isValid || !userId) {
      logger.warn({}, "QR login failed: invalid API key");
      return c.json({ error: "Invalid or expired API key" }, 401);
    }

    // Look up the user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      logger.error({ userId }, "QR login: user not found for valid API key");
      return c.json({ error: "User not found" }, 404);
    }

    // Generate session token and ID
    const sessionToken = crypto.randomBytes(32).toString("base64url");
    const sessionId = generateSecurityId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Insert session into database (same schema as Better Auth)
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId,
      token: sessionToken,
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "qr-login",
      userAgent: c.req.header("user-agent") || "QR Login Client",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    // Sign the token (matching Better Auth's setSignedCookie format: "{token}.{base64-hmac}")
    const signature = signToken(sessionToken, config.security.betterAuthSecret);
    const signedCookieValue = `${sessionToken}.${encodeURIComponent(signature)}`;

    // Set the session cookie
    c.header(
      "Set-Cookie",
      `better-auth.session_token=${signedCookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
    );

    logger.info({ userId, sessionId }, "QR login successful");

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "QR login error",
    );
    return c.json({ error: "Authentication failed" }, 500);
  }
});
