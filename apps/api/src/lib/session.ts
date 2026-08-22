import type { CookieOptions, Request, Response } from "express";
import { config } from "../config.js";
import { unauthorized } from "./errors.js";
import { signAccessToken, verifyAccessToken } from "./jwt.js";

export const SESSION_COOKIE = "flare_session";

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.get("cookie");
  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  void _maxAge;
  res.clearCookie(SESSION_COOKIE, options);
}

export async function issueSession(res: Response, userId: string): Promise<void> {
  setSessionCookie(res, await signAccessToken(userId));
}

export async function getSessionUserId(req: Request): Promise<string> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) {
    throw unauthorized();
  }

  try {
    return await verifyAccessToken(token);
  } catch {
    throw unauthorized();
  }
}

