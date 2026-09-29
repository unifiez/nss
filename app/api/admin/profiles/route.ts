import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { generateUniqueId, listProfiles, parseProfileInput } from "@/lib/profiles";
import { getProfiles } from "@/lib/db";

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
    const id = await generateUniqueId();
    const now = new Date().toISOString();
    const profiles = await getProfiles();

    await profiles.insertOne({
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await profiles.findOne({ id });
    if (!doc) throw new Error("Failed to create profile.");

    return NextResponse.json({ ok: true, profile: doc }, { status: 201 });
  } catch (err: unknown) {
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
