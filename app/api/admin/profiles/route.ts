import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import {
  generateUniqueId,
  listProfiles,
  parseProfileInput,
  resolveUsername,
} from "@/lib/profiles";
import { ensureProfileIndexes, getProfiles } from "@/lib/db";
import { duplicateKeyMessage } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const input = parseProfileInput(body);
    // Build the uniqueness backstop before writing, so the first request to
    // touch a fresh database is already protected against a lost race.
    await ensureProfileIndexes();

    const id = await generateUniqueId();
    const username = await resolveUsername(input.username, input.name);
    const now = new Date().toISOString();
    const profiles = await getProfiles();

    // `username` is written after the spread so the resolved value wins over
    // the raw one that came in on the payload.
    await profiles.insertOne({
      ...input,
      id,
      username,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await profiles.findOne({ id });
    if (!doc) throw new Error("Failed to create profile.");

    return NextResponse.json({ ok: true, profile: doc }, { status: 201 });
  } catch (err: unknown) {
    const friendly = duplicateKeyMessage(err);
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
    const message = err instanceof Error ? err.message : "Failed to create profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  try {
    const profiles = await listProfiles();
    return NextResponse.json({ profiles });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not read profiles from the database.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
