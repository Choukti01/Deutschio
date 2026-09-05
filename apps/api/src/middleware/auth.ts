import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { clearSessionCookie } from "../services/sessionCookies.js";
import {
  getActiveSession,
  SESSION_COOKIE_NAME,
  tokenMatchesHash,
  type ActiveSession,
} from "../services/sessions.js";

type SessionRequest = ActiveSession & { token: string };

export type AuthenticatedRequest = Request & {
  userId?: string;
  authMethod?: "session" | "bearer";
  session?: SessionRequest;
};

export function readCookie(request: Request, name: string) {
  const encodedValue = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!encodedValue) return undefined;
  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return undefined;
  }
}

function bearerToken(request: Request) {
  const header = request.headers.authorization;
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const sessionToken = readCookie(req, SESSION_COOKIE_NAME);
    if (sessionToken) {
      const session = await getActiveSession(sessionToken);
      if (session) {
        req.userId = session.userId;
        req.authMethod = "session";
        req.session = { ...session, token: sessionToken };
        return next();
      }
    }

    const token = env.LEGACY_BEARER_AUTH ? bearerToken(req) : undefined;
    if (token) {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET, {
          algorithms: ["HS256"],
          issuer: "deutschio-api",
          audience: "deutschio-web",
        });
        if (typeof payload === "string" || !payload.sub) throw new Error("Invalid token");
        req.userId = payload.sub;
        req.authMethod = "bearer";
        return next();
      } catch {
        return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Session is invalid or expired" } });
      }
    }

    if (sessionToken) {
      clearSessionCookie(res);
      return res.status(401).json({ error: { code: "INVALID_SESSION", message: "Session is invalid or expired" } });
    }
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } });
  } catch (error) {
    return next(error);
  }
}

export function requireCsrf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.authMethod === "bearer") return next();
  const csrfToken = req.header("x-csrf-token");
  if (!req.session || !csrfToken || !tokenMatchesHash(csrfToken, req.session.csrfTokenHash)) {
    return res.status(403).json({ error: { code: "CSRF_TOKEN_INVALID", message: "A valid CSRF token is required" } });
  }
  const origin = req.header("origin");
  if (origin && ![...env.CORS_ORIGINS, env.APP_URL].includes(origin)) {
    return res.status(403).json({ error: { code: "CSRF_ORIGIN_INVALID", message: "Request origin is not allowed" } });
  }
  return next();
}
