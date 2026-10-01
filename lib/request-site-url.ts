import { headers } from "next/headers";
import { getProfileSlug } from "@/lib/site-url";

/**
 * The public origin, falling back to the host the request actually arrived on.
 *
 * NEXT_PUBLIC_SITE_URL is inlined at build time, so a deployment that forgets
 * to set it silently encodes http://localhost:3000 into every QR code. That
 * failure is invisible until someone tries to scan a printed card, which is a
 * genuinely expensive way to find out — hence this fallback.
 *
 * Setting NEXT_PUBLIC_SITE_URL is still the correct fix and takes precedence.
 * The fallback trusts the Host header, so treat it as a safety net rather than
 * a configuration method.
 */
export async function getRequestSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host");
  if (!host) return "http://localhost:3000";

  const forwardedProto = store.get("x-forwarded-proto");
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
  const proto = forwardedProto ?? (isLocal ? "http" : "https");

  return `${proto}://${host}`;
}

/** Absolute URL for a profile, using the resolved origin. */
export async function getProfileUrlFor(profile: {
  id: string;
  username?: string | null;
}): Promise<string> {
  return `${await getRequestSiteUrl()}/u/${getProfileSlug(profile)}`;
}