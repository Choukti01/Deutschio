import "dotenv/config";
import { z } from "zod";

// Zod 4's `default()` receives the output type of a transform, so defaults
// need to be booleans rather than their string environment representation.
const booleanFromEnvironment = z.enum(["true", "false"]).transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  // Cookie sessions are the default authentication mechanism. A JWT secret is
  // only needed when deliberately enabling the legacy bearer-token bridge.
  JWT_SECRET: z.string().min(32).optional(),
  APP_URL: z.string().url(),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  COOKIE_SECURE: booleanFromEnvironment.default(false),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional().transform((value) => value?.trim() || undefined),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  // Cookie sessions are the secure default. Keep bearer support opt-in only
  // while a deliberately compatible legacy client is being migrated.
  LEGACY_BEARER_AUTH: booleanFromEnvironment.default(false),
  // A local-only developer aid. Never enable this in a public environment,
  // because verification links are authentication secrets.
  EXPOSE_DEV_VERIFICATION_URL: booleanFromEnvironment.default(false),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Deutschio <onboarding@resend.dev>"),
}).superRefine((value, context) => {
  if (value.COOKIE_SAME_SITE === "none" && !value.COOKIE_SECURE) {
    context.addIssue({ code: "custom", message: "COOKIE_SECURE must be true when COOKIE_SAME_SITE is none" });
  }
  if (value.NODE_ENV === "production" && !value.COOKIE_SECURE) {
    context.addIssue({ code: "custom", message: "COOKIE_SECURE must be true in production" });
  }
  if (value.LEGACY_BEARER_AUTH && !value.JWT_SECRET) {
    context.addIssue({ code: "custom", message: "JWT_SECRET is required when LEGACY_BEARER_AUTH is enabled" });
  }
});

const parsed = schema.parse(process.env);
const configuredOrigins = (parsed.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => new URL(origin).origin);

export const env = {
  ...parsed,
  WEB_URL: new URL(parsed.WEB_URL).origin,
  APP_URL: new URL(parsed.APP_URL).origin,
  CORS_ORIGINS: [...new Set([new URL(parsed.WEB_URL).origin, ...configuredOrigins])],
};
