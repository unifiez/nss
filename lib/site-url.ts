/** Client-safe helpers for building profile paths. */

/**
 * The part that goes after /u/. Profiles created before usernames existed have
 * no `username`, so the immutable random id stays as the fallback and old
 * links keep working.
 *
 * For absolute URLs on the server, prefer getProfileUrlFor from
 * lib/request-site-url.ts — it resolves the real origin instead of trusting a
 * build-time constant.
 */
export function getProfileSlug(profile: {
  id: string;
  username?: string | null;
}): string {
  return profile.username?.trim() || profile.id;
}