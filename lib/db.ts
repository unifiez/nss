import { MongoClient, type Collection, type Db } from "mongodb";
import type { Profile, Settings } from "@/lib/types";

let clientPromise: Promise<MongoClient> | null = null;

function uri(): string | null {
  const value = process.env.MONGODB_URI?.trim();
  return value ? value : null;
}

function dbName(): string {
  return process.env.MONGODB_DB?.trim() || "nss_profiles";
}

/** False when MONGODB_URI is still blank, so pages can show setup help. */
export function isDbConfigured(): boolean {
  return uri() !== null;
}

/** Actionable hint shown when the database is not wired up yet. */
export function getDbConfiguredMessage(): string {
  return "MONGODB_URI is not set. Copy .env.example to .env.local, add your MongoDB connection string, then restart the dev server.";
}

function getClient(): Promise<MongoClient> {
  const connectionString = uri();
  if (!connectionString) throw new Error("MONGODB_URI is not set.");

  if (!clientPromise) {
    const client = new MongoClient(connectionString);
    clientPromise = client.connect().catch((error) => {
      // Let the next request retry instead of caching a dead connection.
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName());
}

export async function getProfiles(): Promise<Collection<Profile>> {
  return (await getDb()).collection<Profile>("profiles");
}

export async function getSettings(): Promise<Collection<Settings>> {
  return (await getDb()).collection<Settings>("settings");
}

let indexesReady: Promise<void> | null = null;

/**
 * Create the indexes that make `id` and `username` unique.
 *
 * The write routes already pre-check for clashes so they can return a readable
 * message, but a pre-check alone loses a race between two admins saving at the
 * same moment. This index is the actual guarantee.
 *
 * Failures are logged and swallowed rather than thrown: losing the database
 * backstop should not take the whole app down, and the next request retries.
 */
export function ensureProfileIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const profiles = await getProfiles();
      await profiles.createIndex({ id: 1 }, { unique: true, name: "id_unique" });
      await profiles.createIndex(
        { username: 1 },
        {
          unique: true,
          name: "username_unique",
          // Only real usernames participate, so legacy documents with no
          // username field — or an empty one — never collide with each other.
          partialFilterExpression: { username: { $type: "string", $gt: "" } },
        },
      );
    })().catch((error) => {
      indexesReady = null;
      console.warn(
        "[db] could not ensure profile indexes:",
        error instanceof Error ? error.message : error,
      );
    });
  }
  return indexesReady;
}
