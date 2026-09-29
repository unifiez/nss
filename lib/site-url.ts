/** Client-safe helpers for building shareable profile links. */

export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return configured.replace(/\/$/, "");
}

export function getProfileUrl(id: string): string {
  return `${getSiteUrl()}/u/${id}`;
}
