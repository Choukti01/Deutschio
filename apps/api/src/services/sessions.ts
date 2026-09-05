import crypto from "node:crypto";
import { Types } from "mongoose";
import { env } from "../config.js";
import { Session } from "../models/Session.js";

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
  await Session.create({
    user: new Types.ObjectId(userId),
    tokenHash: hashToken(token),
    csrfTokenHash: hashToken(csrfToken),
    expiresAt,
  });
  return { token, csrfToken, expiresAt, maxAge: sessionLifetimeMs };
}

export type ActiveSession = {
  id: string;
  userId: string;
  csrfTokenHash: string;
};

export async function getActiveSession(token: string): Promise<ActiveSession | null> {
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
    revokedAt: { $exists: false },
  }).select("+csrfTokenHash");
  if (!session) return null;
  await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  return { id: session.id, userId: session.user.toString(), csrfTokenHash: session.csrfTokenHash };
}

export async function revokeSession(token: string) {
  await Session.updateOne({ tokenHash: hashToken(token), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllSessionsForUser(userId: string) {
  await Session.updateMany({ user: new Types.ObjectId(userId), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

export async function rotateCsrfToken(sessionId: string) {
  const csrfToken = crypto.randomBytes(32).toString("base64url");
  const updated = await Session.findByIdAndUpdate(
    sessionId,
    { $set: { csrfTokenHash: hashToken(csrfToken) } },
    { new: true },
  );
  return updated ? csrfToken : null;
}
