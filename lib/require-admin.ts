import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/auth";

/** Shared guard for every /api/admin route. */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin credentials are not configured. Set them in .env.local." },
      { status: 503 },
    );
  }

  const { isAdmin } = await import("@/lib/auth");
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  return null;
}
