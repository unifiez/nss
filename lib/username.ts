/**
 * Rules for the public `/u/<username>` slug.
 *
 * This module is deliberately dependency-free so the admin form can import it
 * for live sanitising, while route handlers use the same rules server-side.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/**
 * Names that would shadow a real route or are easy to mistake for one.
 * A profile called "admin" would be unreachable, since /admin is the panel.
 */
const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "login",
  "logout",
  "signin",
  "signout",
  "settings",
  "static",
  "assets",
  "public",
  "www",
  "support",
  "help",
  "about",
  "root",
  "system",
  "null",
  "undefined",
  "new",
  "edit",
  "delete",
  "index",
  "home",
  "dashboard",
  "profile",
  "profiles",
  "user",
  "users",
  "me",
]);

/**
 * Fold anything a person might type into a safe slug: accents dropped,
 * lowercased, every run of punctuation collapsed to a single hyphen.
 * This is intentionally forgiving — it is what turns "Yashwant Singh" into
 * "yashwant-singh" while the admin is still typing.
 */
export function sanitizeUsername(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_MAX)
    .replace(/-+$/, "");
}

/**
 * Validate an already-sanitised slug. Returns null when it is usable, or a
 * message explaining what is wrong with it.
 */
export function usernameProblem(username: string): string | null {
  if (!username) return "Username is required.";
  if (username.length < USERNAME_MIN) {
    return `Username needs at least ${USERNAME_MIN} characters.`;
  }
  if (username.length > USERNAME_MAX) {
    return `Username can be at most ${USERNAME_MAX} characters.`;
  }
  // Deliberately narrower than the usual URL-slug rule set: no underscores,
  // no trailing dashes. Keeping this in step with sanitizeUsername means a
  // slug that passes validation is always exactly what gets stored.
  if (!/^[a-z][a-z0-9-]*$/.test(username)) {
    return "Start with a letter, then use lowercase letters, numbers and hyphens.";
  }
  if (RESERVED.has(username)) {
    return `"${username}" is reserved. Pick something else.`;
  }
  return null;
}

/**
 * Guess a username from a person's name, used to pre-fill the field and as the
 * fallback when the admin leaves it blank.
 *
 * Every word is joined, so the suggestion is identical to what you would get by
 * typing the whole name into the field yourself — the field must not behave
 * differently depending on whether it was touched. Long names drop trailing
 * words rather than being cut mid-word.
 */
export function suggestUsername(name: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) return "";

  let base = "";
  for (const word of words) {
    const next = base ? `${base}-${word}` : word;
    if (next.length > USERNAME_MAX) break;
    base = next;
  }

  base = sanitizeUsername(base);
  if (base && RESERVED.has(base)) base = sanitizeUsername(`${base}-nss`);
  return base;
}