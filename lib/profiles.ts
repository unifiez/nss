import { randomBytes } from "node:crypto";
import { getProfiles, getSettings } from "@/lib/db";
import type { Profile } from "@/lib/types";
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

export async function getProfile(id: string): Promise<Profile | null> {
  const profiles = await getProfiles();
  return profiles.findOne({ id });
}

export async function countProfiles(): Promise<number> {
  const profiles = await getProfiles();
  return profiles.countDocuments();
}

export type ProfileInput = {
  name: string;
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

  return {
    name,
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
