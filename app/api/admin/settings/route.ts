import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getDefaultMainColor, setDefaultMainColor } from "@/lib/profiles";
import { isDbConfigured } from "@/lib/db";
import { normalizeHex } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const defaultMainColor = await getDefaultMainColor();
  return NextResponse.json({ defaultMainColor });
}

export async function PATCH(request: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  if (!isDbConfigured()) {
    return NextResponse.json({ error: "MONGODB_URI is not set." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const color = String(input.defaultMainColor ?? "").trim();
  const hex = normalizeHex(color);
  if (!hex) {
    return NextResponse.json(
      { error: "defaultMainColor must be a valid hex colour." },
      { status: 400 },
    );
  }

  await setDefaultMainColor(hex);
  return NextResponse.json({ ok: true, defaultMainColor: hex });
}
