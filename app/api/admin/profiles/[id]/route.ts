import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getProfile, parseProfileInput } from "@/lib/profiles";
import { getProfiles } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const existing = await getProfile(id);
    if (!existing) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const input = parseProfileInput(body);
    const profiles = await getProfiles();
    await profiles.updateOne(
      { id },
      { $set: { ...input, updatedAt: new Date().toISOString() } },
    );

    const doc = await profiles.findOne({ id });
    if (!doc) throw new Error("Failed to update profile.");

    return NextResponse.json({ ok: true, profile: doc });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const { id } = await params;
  const profiles = await getProfiles();
  const res = await profiles.deleteOne({ id });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
