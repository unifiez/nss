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
