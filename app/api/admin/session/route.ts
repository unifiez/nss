import { NextResponse } from "next/server";
import { endSession, isAuthConfigured, startSession, verifyCredentials } from "@/lib/auth";
import { getSessionSecret } from "@/lib/session-token";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    const missing: string[] = [];
    if (!process.env.ADMIN_USERNAME?.trim()) missing.push("ADMIN_USERNAME");
    if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
    if (!getSessionSecret()) missing.push("SESSION_SECRET");

    return NextResponse.json(
      {
        error: "Admin auth not configured.",
        missing,
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const username = String(input.username ?? "");
  const password = String(input.password ?? "");

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await startSession(username);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
