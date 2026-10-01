/** Client-safe helpers for building shareable profile links. */

export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return configured.replace(/\/$/, "");
}

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

export function getProfileUrlBySlug(slug: string): string {
  return `${getSiteUrl()}/u/${slug}`;
}

export function getProfileUrl(profile: {
  id: string;
  username?: string | null;
}): string {
  return getProfileUrlBySlug(getProfileSlug(profile));
}