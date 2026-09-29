/**
 * Pure session-token helpers. Deliberately free of `next/headers` so the same
 * code can be used from `proxy.ts` (request time) and from server components.
 */

import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "nss_admin_session";

/** 8 hours. */
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

const MIN_SECRET_LENGTH = 16;

export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

/** Constant-time string compare (length differences do not leak via timing). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Both comparisons always run, so a wrong username costs the same as a wrong password. */
export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME?.trim();
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!getSessionSecret() || !expectedUser || !expectedPassword) return false;

  const userOk = safeEqual(username.trim(), expectedUser);
  const passOk = safeEqual(password, expectedPassword);
  return userOk && passOk;
}

export type SessionPayload = { username: string; expiresAt: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(username: string): string {
  const secret = getSessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is not set.");

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${encodeURIComponent(username)}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Parse without verifying — cheap enough for the proxy's optimistic check. */
export function peekSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [rawUser, rawExp] = parts;
  const expiresAt = Number(rawExp);
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt * 1000 <= Date.now()) return null;

  return { username: decodeURIComponent(rawUser), expiresAt };
}

/** Parse and verify the signature. This is the authoritative check. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  const payload = peekSession(token);
  if (!payload) return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  const parts = token!.split(".");
  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  if (!safeEqual(parts[2], expected)) return null;

  return payload;
}
