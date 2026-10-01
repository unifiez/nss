/** Helpers for turning driver errors into something an admin can act on. */

function hasCode(error: unknown, code: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === code
  );
}

/**
 * Mongo raises a duplicate-key error (11000) when a unique index rejects a
 * write. The pre-checks in lib/profiles.ts normally catch this first and
 * return a nicer message; this is the fallback for when two writes really do
 * race each other, so the admin still gets a message about the username
 * rather than a stack trace.
 */
export function duplicateKeyMessage(error: unknown): string | null {
  if (!hasCode(error, 11000)) return null;
  const keyPattern =
    typeof error === "object" && error !== null
      ? ((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})
      : {};
  if ("username" in keyPattern) {
    return "That username was just taken by another profile. Pick a different one.";
  }
  return "That profile already exists. Please try again.";
}