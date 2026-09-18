import crypto from "node:crypto";
import { env } from "../config.js";
import { id, query } from "../db.js";

const sessionLifetimeMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME = "deutschio_session";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function tokenMatchesHash(token: string, expectedHash: string) {
  const receivedHash = Buffer.from(hashToken(token), "hex");
  const storedHash = Buffer.from(expectedHash, "hex");
  return receivedHash.length === storedHash.length && crypto.timingSafeEqual(receivedHash, storedHash);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrfToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  await query("INSERT INTO sessions (id, user_id, token_hash, csrf_token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)", [id(), userId, hashToken(token), hashToken(csrfToken), expiresAt]);
  return { token, csrfToken, expiresAt, maxAge: sessionLifetimeMs };
}

export type ActiveSession = {
  id: string;
  userId: string;
  csrfTokenHash: string;
};

export async function getActiveSession(token: string): Promise<ActiveSession | null> {
  const result = await query<{ id: string; user_id: string; csrf_token_hash: string }>("UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1 AND expires_at > now() AND revoked_at IS NULL RETURNING id, user_id, csrf_token_hash", [hashToken(token)]);
  const session = result.rows[0];
  return session ? { id: session.id, userId: session.user_id, csrfTokenHash: session.csrf_token_hash } : null;
}

export async function revokeSession(token: string) {
  await query("UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [hashToken(token)]);
}

export async function revokeAllSessionsForUser(userId: string) {
  await query("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [userId]);
}

export async function rotateCsrfToken(sessionId: string) {
  const csrfToken = crypto.randomBytes(32).toString("base64url");
  const updated = await query("UPDATE sessions SET csrf_token_hash = $1 WHERE id = $2 AND expires_at > now() AND revoked_at IS NULL", [hashToken(csrfToken), sessionId]);
  return updated.rowCount ? csrfToken : null;
}
