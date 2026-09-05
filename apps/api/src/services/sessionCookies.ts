import type { CookieOptions, Response } from "express";
import { env } from "../config.js";
import { SESSION_COOKIE_NAME } from "./sessions.js";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function setSessionCookie(response: Response, token: string, maxAge: number) {
  response.cookie(SESSION_COOKIE_NAME, token, { ...cookieOptions, maxAge });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
}
