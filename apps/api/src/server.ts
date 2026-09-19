import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "./config.js";
import { assertDatabaseRuntimeConfiguration, id, migrate, pool, publicUser, query, type UserRow } from "./db.js";
import { ApiError } from "./errors.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "./middleware/auth.js";
import { coursesRouter } from "./routes/courses.js";
import { lessonsRouter } from "./routes/lessons.js";
import { meRouter } from "./routes/me.js";
import { clearSessionCookie, setSessionCookie } from "./services/sessionCookies.js";
import { createSession, revokeSession, rotateCsrfToken } from "./services/sessions.js";
import { syncCatalog } from "./seed.js";

export const app = express();
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const userColumns = "id, email, password_hash, email_verified, verification_token_hash, verification_token_expires_at, name, avatar_url, notes, learning_language, plan, created_at";
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin(origin, callback) { if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true); return callback(new ApiError(403, "CORS_ORIGIN_DENIED", "Request origin is not allowed")); }, credentials: true, methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"], maxAge: 600 }));
app.use(express.json({ limit: "100kb" }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const verificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });
const emailSchema = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) });
const passwordSchema = z.string().min(12, "Use at least 12 characters for your password").max(128);
// Existing accounts may have been created under the previous 10-character
// minimum. Keep sign-in compatible while enforcing the stronger rule for new
// registrations.
const credentialsSchema = emailSchema.extend({ password: z.string().min(10).max(128) });
const signUpSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(80) });
// Matching a fixed bcrypt hash for unknown accounts keeps login timing close to
// existing-account logins, so the endpoint does not disclose email membership.
const passwordTimingHash = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7A9i9mR9VnN0LTyXN0vB5qg4p9a2eL6";

function verificationUrl(token: string) { const url = new URL("/api/v1/auth/verify-email", env.APP_URL); url.searchParams.set("token", token); return url; }
async function sendVerification(email: string, url: URL) {
  const mailer = resend;
  if (!mailer) throw new ApiError(503, "EMAIL_DELIVERY_UNAVAILABLE", "Account verification is temporarily unavailable. Please try again later.");
  const result = await mailer.emails.send({ from: env.EMAIL_FROM, to: email, subject: "Verify your Deutschio account", html: `<h2>Welcome to Deutschio</h2><p>Verify your email to begin learning:</p><p><a href="${url}">Verify email</a></p>` });
  if (result.error) {
    console.error("Verification email delivery failed", result.error);
    throw new ApiError(503, "EMAIL_DELIVERY_FAILED", "We could not send the verification email. Please try again shortly.");
  }
}
function developmentVerificationResponse(url: URL) { return env.NODE_ENV === "development" && env.EXPOSE_DEV_VERIFICATION_URL ? { developmentVerificationUrl: url.toString() } : {}; }
function requireEmailDelivery() { if (!resend) throw new ApiError(503, "EMAIL_DELIVERY_UNAVAILABLE", "Account verification is temporarily unavailable. Please try again later."); }

app.get("/health", async (_req, res, next) => {
  try { await query("SELECT 1"); return res.json({ status: "ok", service: "deutschio-api", database: "postgresql" }); } catch (error) { return next(error); }
});
app.use("/api/v1/courses", coursesRouter);
app.use("/api/v1/lessons", lessonsRouter);
app.use("/api/v1/me", meRouter);

app.post("/api/v1/auth/signup", authLimiter, async (req, res, next) => {
  try {
    requireEmailDelivery();
    const input = signUpSchema.parse(req.body);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const database = await pool.connect();
    try {
      await database.query("BEGIN");
      const user = (await database.query<UserRow>(`INSERT INTO users (id, email, password_hash, name, verification_token_hash, verification_token_expires_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${userColumns}`, [id(), input.email, await bcrypt.hash(input.password, 12), input.name, crypto.createHash("sha256").update(rawToken).digest("hex"), new Date(Date.now() + 86_400_000)])).rows[0];
      if (!user) throw new Error("User creation did not return a row");
      const url = verificationUrl(rawToken);
      await sendVerification(user.email, url);
      await database.query("COMMIT");
      return res.status(201).json({ message: "Account created. Check your email to verify it.", ...developmentVerificationResponse(url) });
    } catch (error) {
      await database.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      database.release();
    }
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: unknown }).code === "23505") return res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "An account already exists for this email" } });
    return next(error);
  }
});

app.post("/api/v1/auth/resend-verification", verificationLimiter, async (req, res, next) => {
  try {
    requireEmailDelivery();
    const { email } = emailSchema.parse(req.body);
    const user = (await query<UserRow>(`SELECT ${userColumns} FROM users WHERE email = $1 AND email_verified = false`, [email])).rows[0];
    if (!user) return res.status(202).json({ message: "If this account needs verification, a new email is on its way." });
    const rawToken = crypto.randomBytes(32).toString("hex"); const url = verificationUrl(rawToken);
    await query("UPDATE users SET verification_token_hash = $1, verification_token_expires_at = $2, updated_at = now() WHERE id = $3", [crypto.createHash("sha256").update(rawToken).digest("hex"), new Date(Date.now() + 86_400_000), user.id]);
    await sendVerification(email, url);
    return res.status(202).json({ message: "If this account needs verification, a new email is on its way.", ...developmentVerificationResponse(url) });
  } catch (error) { return next(error); }
});

app.get("/api/v1/auth/verify-email", async (req, res, next) => {
  try {
    const token = z.string().length(64).parse(req.query.token);
    const result = await query("UPDATE users SET email_verified = true, verification_token_hash = NULL, verification_token_expires_at = NULL, updated_at = now() WHERE verification_token_hash = $1 AND verification_token_expires_at > now()", [crypto.createHash("sha256").update(token).digest("hex")]);
    if (!result.rowCount) return res.status(400).json({ error: { code: "INVALID_VERIFICATION", message: "Verification link is invalid or expired" } });
    res.set("Cache-Control", "no-store"); res.set("Referrer-Policy", "no-referrer");
    return res.redirect(new URL("/?verified=true", env.WEB_URL).toString());
  } catch (error) { return next(error); }
});

app.post("/api/v1/auth/login", authLimiter, async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const user = (await query<UserRow>(`SELECT ${userColumns} FROM users WHERE email = $1`, [input.email])).rows[0];
    const passwordMatches = await bcrypt.compare(input.password, user?.password_hash ?? passwordTimingHash);
    if (!user || !passwordMatches) return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    if (!user.email_verified) return res.status(403).json({ error: { code: "EMAIL_NOT_VERIFIED", message: "Verify your email before signing in" } });
    const session = await createSession(user.id); setSessionCookie(res, session.token, session.maxAge);
    const token = env.LEGACY_BEARER_AUTH ? jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: "15m", issuer: "deutschio-api", audience: "deutschio-web" }) : undefined;
    res.set("Cache-Control", "no-store"); return res.json({ user: publicUser(user), csrfToken: session.csrfToken, ...(token ? { token } : {}) });
  } catch (error) { return next(error); }
});

app.get("/api/v1/auth/csrf", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.authMethod !== "session" || !req.session) return res.status(400).json({ error: { code: "CSRF_NOT_AVAILABLE", message: "A cookie session is required to request a CSRF token" } });
    const csrfToken = await rotateCsrfToken(req.session.id);
    if (!csrfToken) { clearSessionCookie(res); return res.status(401).json({ error: { code: "INVALID_SESSION", message: "Session is invalid or expired" } }); }
    res.set("Cache-Control", "no-store"); return res.json({ csrfToken });
  } catch (error) { return next(error); }
});

app.post("/api/v1/auth/logout", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try { if (req.session) await revokeSession(req.session.token); clearSessionCookie(res); res.set("Cache-Control", "no-store"); return res.status(204).send(); } catch (error) { return next(error); }
});

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ApiError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error instanceof z.ZodError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request data is invalid", issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })) } });
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } });
  console.error(error); return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});

export async function initializeApp() {
  assertDatabaseRuntimeConfiguration();
  await migrate();
  await syncCatalog();
}
