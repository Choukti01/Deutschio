import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "./config.js";
import { ApiError } from "./errors.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "./middleware/auth.js";
import { User } from "./models/User.js";
import { coursesRouter } from "./routes/courses.js";
import { lessonsRouter } from "./routes/lessons.js";
import { meRouter } from "./routes/me.js";
import { clearSessionCookie, setSessionCookie } from "./services/sessionCookies.js";
import { createSession, revokeAllSessionsForUser, revokeSession, rotateCsrfToken } from "./services/sessions.js";

const app = express();
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, "CORS_ORIGIN_DENIED", "Request origin is not allowed"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  maxAge: 600,
}));
app.use(express.json({ limit: "100kb" }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const verificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });

const emailSchema = z.object({ email: z.string().email().max(254).transform(value => value.toLowerCase()) });
const credentialsSchema = emailSchema.extend({ password: z.string().min(10).max(128) });
const profileSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), avatarUrl: z.string().url().max(2_000).or(z.literal("")).optional(), notes: z.array(z.object({ text: z.string().trim().min(1).max(2_000), createdAt: z.coerce.date().optional() })).max(100).optional() });
const publicUser = (user: InstanceType<typeof User>) => ({ id: user.id, email: user.email, emailVerified: user.emailVerified, name: user.name, avatarUrl: user.avatarUrl, notes: user.notes, plan: user.plan, createdAt: user.createdAt });

function createVerificationUrl(rawToken: string) {
  const verifyUrl = new URL("/api/v1/auth/verify-email", env.APP_URL);
  verifyUrl.searchParams.set("token", rawToken);
  return verifyUrl;
}

async function sendVerificationEmail(email: string, verificationUrl: URL) {
  if (!resend) return;
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Verify your Deutschio account",
    html: `<h2>Welcome to Deutschio</h2><p>Verify your email to begin learning:</p><p><a href="${verificationUrl}">Verify email</a></p>`,
  });
}

function developmentVerificationResponse(verificationUrl: URL) {
  return env.NODE_ENV === "development" && env.EXPOSE_DEV_VERIFICATION_URL
    ? { developmentVerificationUrl: verificationUrl.toString() }
    : {};
}

app.get("/health", (_req, res) => res.json({ status: "ok", service: "deutschio-api" }));
app.use("/api/v1/courses", coursesRouter);
app.use("/api/v1/lessons", lessonsRouter);
app.use("/api/v1/me", meRouter);

app.post("/api/v1/auth/signup", authLimiter, async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    if (await User.exists({ email: input.email })) return res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "An account already exists for this email" } });
    const rawToken = crypto.randomBytes(32).toString("hex");
    const user = await User.create({ email: input.email, passwordHash: await bcrypt.hash(input.password, 12), verificationTokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"), verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    const verificationUrl = createVerificationUrl(rawToken);
    await sendVerificationEmail(user.email, verificationUrl);
    return res.status(201).json({ message: "Account created. Check your email to verify it.", ...developmentVerificationResponse(verificationUrl) });
  } catch (error) { next(error); }
});

// Always reply with the same success message so this endpoint cannot reveal
// whether a particular email address has an account.
app.post("/api/v1/auth/resend-verification", verificationLimiter, async (req, res, next) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const user = await User.findOne({ email, emailVerified: false });
    if (!user) return res.status(202).json({ message: "If this account needs verification, a new email is on its way." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const verificationUrl = createVerificationUrl(rawToken);
    user.verificationTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user.email, verificationUrl);
    return res.status(202).json({ message: "If this account needs verification, a new email is on its way.", ...developmentVerificationResponse(verificationUrl) });
  } catch (error) { return next(error); }
});

app.get("/api/v1/auth/verify-email", async (req, res, next) => {
  try {
    const token = z.string().length(64).parse(req.query.token);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ verificationTokenHash: tokenHash, verificationTokenExpiresAt: { $gt: new Date() } }).select("+verificationTokenHash +verificationTokenExpiresAt");
    if (!user) return res.status(400).json({ error: { code: "INVALID_VERIFICATION", message: "Verification link is invalid or expired" } });
    user.emailVerified = true; user.verificationTokenHash = undefined; user.verificationTokenExpiresAt = undefined; await user.save();
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    return res.redirect(new URL("/?verified=true", env.WEB_URL).toString());
  } catch (error) { next(error); }
});

app.post("/api/v1/auth/login", authLimiter, async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    if (!user || !await bcrypt.compare(input.password, user.passwordHash)) return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    if (!user.emailVerified) return res.status(403).json({ error: { code: "EMAIL_NOT_VERIFIED", message: "Verify your email before signing in" } });
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, session.maxAge);
    const token = env.LEGACY_BEARER_AUTH
      ? jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: "15m", issuer: "deutschio-api", audience: "deutschio-web" })
      : undefined;
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user), csrfToken: session.csrfToken, ...(token ? { token } : {}) });
  } catch (error) { next(error); }
});

app.get("/api/v1/auth/csrf", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.authMethod !== "session" || !req.session) {
      return res.status(400).json({ error: { code: "CSRF_NOT_AVAILABLE", message: "A cookie session is required to request a CSRF token" } });
    }
    const csrfToken = await rotateCsrfToken(req.session.id);
    if (!csrfToken) {
      clearSessionCookie(res);
      return res.status(401).json({ error: { code: "INVALID_SESSION", message: "Session is invalid or expired" } });
    }
    res.set("Cache-Control", "no-store");
    return res.json({ csrfToken });
  } catch (error) { return next(error); }
});

app.post("/api/v1/auth/logout", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.session) await revokeSession(req.session.token);
    clearSessionCookie(res);
    res.set("Cache-Control", "no-store");
    return res.status(204).send();
  } catch (error) { return next(error); }
});

// Legacy profile routes remain during the frontend migration. New work should use /api/v1/me/profile.
app.get("/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Account not found" } });
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.put("/profile", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.userId, { $set: input }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Account not found" } });
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.delete("/profile", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Account not found" } });
    await revokeAllSessionsForUser(req.userId!);
    clearSessionCookie(res);
    res.set("Cache-Control", "no-store");
    return res.status(204).send();
  } catch (error) { return next(error); }
});

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ApiError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request data is invalid",
        issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      },
    });
  }
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request data is invalid" } });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    return res.status(409).json({ error: { code: "CONFLICT", message: "A record with those details already exists" } });
  }
  console.error(error);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});

async function start() {
  if (env.NODE_ENV === "production" && !resend) throw new Error("RESEND_API_KEY is required in production");
  await mongoose.connect(env.MONGO_URI);
  app.listen(env.PORT, () => console.log(`Deutschio API listening on ${env.PORT}`));
}
start().catch(error => { console.error("Failed to start Deutschio API", error); process.exit(1); });
