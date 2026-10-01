import { randomBytes } from "node:crypto";
import { getProfiles, getSettings } from "@/lib/db";
import type { Profile } from "@/lib/types";
import {
  sanitizeUsername,
  suggestUsername,
  USERNAME_MAX,
  usernameProblem,
} from "@/lib/username";
import { DEFAULT_MAIN_COLOR, normalizeHex } from "@/lib/theme";

export { EMPTY_LINKS } from "@/lib/types";

/** Short, unambiguous alphabet: no 0/O/1/l so URLs are easy to read aloud. */
const ID_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

export function generateProfileId(length = 8): string {
  const bytes = randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i += 1) {
    id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  }
  return id;
}

/** Generate an id that is not already taken. */
export async function generateUniqueId(): Promise<string> {
  const profiles = await getProfiles();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = generateProfileId();
    const clash = await profiles.findOne({ id }, { projection: { _id: 1 } });
    if (!clash) return id;
  }
  throw new Error("Could not allocate a unique profile id.");
}

/** The colour handed to newly created profiles. */
export async function getDefaultMainColor(): Promise<string> {
  try {
    const settings = await getSettings();
    const doc = await settings.findOne({ _id: "settings" });
    return normalizeHex(doc?.defaultMainColor ?? "") ?? DEFAULT_MAIN_COLOR;
  } catch {
    return DEFAULT_MAIN_COLOR;
  }
}

export async function setDefaultMainColor(color: string): Promise<void> {
  const hex = normalizeHex(color);
  if (!hex) throw new Error("Invalid hex colour.");
  const settings = await getSettings();
  await settings.updateOne(
    { _id: "settings" },
    { $set: { defaultMainColor: hex } },
    { upsert: true },
  );
}

export async function listProfiles(): Promise<Profile[]> {
  const profiles = await getProfiles();
  return profiles.find().sort({ createdAt: -1 }).toArray();
}

/** Best-effort variant for the public home page: shows an empty grid if the
 *  database is unreachable rather than 500-ing the whole route. */
export async function listProfilesSafe(): Promise<Profile[]> {
  try {
    return await listProfiles();
  } catch {
    return [];
  }
}

/** Look up by the immutable internal id. Used by admin and photo routes. */
export async function getProfile(id: string): Promise<Profile | null> {
  const profiles = await getProfiles();
  return profiles.findOne({ id });
}

/**
 * Look up a public slug. A username always wins over a matching id, and
 * resolveUsername keeps the two from ever colliding in the first place.
 */
export async function getProfileBySlug(slug: string): Promise<Profile | null> {
  const profiles = await getProfiles();
  return profiles.findOne({ $or: [{ username: slug }, { id: slug }] });
}

export async function countProfiles(): Promise<number> {
  const profiles = await getProfiles();
  return profiles.countDocuments();
}

/**
 * True when the slug is already spoken for. Both fields are checked because a
 * username that matches somebody's random id would make /u/<slug> ambiguous.
 */
export async function isUsernameTaken(
  username: string,
  excludeId?: string,
): Promise<boolean> {
  const profiles = await getProfiles();
  const doc = await profiles.findOne(
    {
      $or: [{ username }, { id: username }],
      ...(excludeId ? { id: { $ne: excludeId } } : {}),
    },
    { projection: { _id: 1 } },
  );
  return Boolean(doc);
}

/**
 * Work out the username to store.
 *
 * An explicit value the admin typed is honoured as-is (after sanitising) and a
 * clash is reported rather than silently rewritten, so the URL always reflects
 * a choice somebody made. A blank or unusable value falls back to one derived
 * from the name, with a numeric suffix appended until it is free — creating a
 * profile can therefore never fail just because the field was skipped.
 */
export async function resolveUsername(
  raw: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const requested = raw.trim();

  if (requested) {
    const candidate = sanitizeUsername(requested);
    const problem = usernameProblem(candidate);
    if (problem) throw new Error(problem);
    if (await isUsernameTaken(candidate, excludeId)) {
      throw new Error(
        `The username "${candidate}" is already taken. Choose another one.`,
      );
    }
    return candidate;
  }

  const base = suggestUsername(name);
  if (!base || usernameProblem(base)) {
    // e.g. a name of just "Li" derives "li", which is below the minimum and
    // appending -2/-3 would not help. The form already flags this while
    // typing, so an explicit ask here is a backstop, not the usual path.
    throw new Error(
      "Could not build a valid username from this name. Please enter one of at least 3 characters.",
    );
  }

  for (let n = 1; n <= 50; n += 1) {
    const suffix = n === 1 ? "" : `-${n}`;
    const candidate = `${base.slice(0, USERNAME_MAX - suffix.length)}${suffix}`;
    if (!(await isUsernameTaken(candidate, excludeId))) return candidate;
  }
  throw new Error("Could not allocate a unique username.");
}

export type ProfileInput = {
  name: string;
  /** Sanitised, but not yet checked for uniqueness. Empty means "derive one". */
  username: string;
  branch: string;
  year: string;
  mainColor: string;
  photo: string | null;
  photoWidth: number;
  photoHeight: number;
  links: Profile["links"];
};

/** Max accepted base64 payload. Mongo caps a document at 16MB; stay well under. */
const MAX_PHOTO_CHARS = 6 * 1024 * 1024;

function text(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function dimension(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 0;
}

/** Strip an accidental `data:image/png;base64,` prefix — Mongo stores raw base64. */
function cleanPhoto(value: unknown): string | null {
  if (value == null || value === "") return null;
  const raw = String(value).replace(/^data:image\/\w+;base64,/, "").trim();
  if (!raw) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw new Error("Photo must be a base64 encoded PNG.");
  }
  if (raw.length > MAX_PHOTO_CHARS) {
    throw new Error("Photo is too large. Please use a smaller image.");
  }
  return raw;
}

/**
 * Validate a create/update payload coming from the admin panel.
 * Throws with a user-facing message so route handlers can surface it directly.
 *
 * `username` is validated for shape only; uniqueness needs the database, so the
 * route handlers resolve it through resolveUsername.
 */
export function parseProfileInput(body: unknown): ProfileInput {
  const input = (body ?? {}) as Record<string, unknown>;
  const rawLinks = (input.links ?? {}) as Record<string, unknown>;

  const name = text(input.name, 60);
  if (!name) throw new Error("Name is required.");

  const mainColor = normalizeHex(text(input.mainColor, 7));
  if (!mainColor) {
    throw new Error("Main colour must be a hex value like #0038a8.");
  }

  const username = sanitizeUsername(text(input.username, USERNAME_MAX + 8));

  return {
    name,
    username,
    branch: text(input.branch, 60),
    year: text(input.year, 30),
    mainColor,
    photo: cleanPhoto(input.photo),
    photoWidth: dimension(input.photoWidth),
    photoHeight: dimension(input.photoHeight),
    links: {
      email: text(rawLinks.email, 120),
      phone: text(rawLinks.phone, 40),
      instagram: text(rawLinks.instagram, 120),
      linkedin: text(rawLinks.linkedin, 120),
    },
  };
}