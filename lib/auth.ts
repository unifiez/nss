import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifyCredentials,
  verifySessionToken,
} from "@/lib/session-token";

/** True when the env has everything needed to log in. */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME?.trim() &&
      process.env.ADMIN_PASSWORD &&
      verifySessionSecretReady(),
  );
}

function verifySessionSecretReady(): boolean {
  const secret = process.env.SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 16);
}

export { verifyCredentials };

export async function startSession(username: string): Promise<void> {
  const token = createSessionToken(username);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Authoritative check — verifies the HMAC signature. */
export async function getSession(): Promise<{ username: string } | null> {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  return session ? { username: session.username } : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getSession()) !== null;
}
