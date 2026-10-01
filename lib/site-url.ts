/** Client-safe helpers for building profile paths. */

/**
 * The part that goes after /u/. Profiles created before usernames existed have
 * no `username`, so the immutable random id stays as the fallback and old
 * links keep working.
 */
export function getProfileSlug(profile: {
  id: string;
  username?: string | null;
}): string {
  return profile.username?.trim() || profile.id;
}

/**
 * The configured public origin, or "" when NEXT_PUBLIC_SITE_URL is unset.
 *
 * Next inlines NEXT_PUBLIC_* at build time, so in the browser this is whatever
 * the bundle was built with — it will not follow a later edit to .env.local
 * until the app is rebuilt.
 */
export function getConfiguredSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "";
}

/**
 * The link to hand to a human: the configured origin, so a copy made on a
 * localhost preview still points at the real site and matches what the QR
 * codes encode.
 *
 * Falls back to the origin actually being viewed, because when the site URL
 * is genuinely unknown — a fork with no .env.local, a preview deploy — that
 * origin is the only one that can work.
 *
 * Server code should use getProfileUrlFor from lib/request-site-url.ts, which
 * additionally understands proxy headers such as x-forwarded-host.
 */
export function getProfileShareUrl(profile: {
  id: string;
  username?: string | null;
}): string {
  const origin =
    getConfiguredSiteUrl() ||
    (typeof window === "undefined" ? "" : window.location.origin);
  return `${origin}/u/${getProfileSlug(profile)}`;
}