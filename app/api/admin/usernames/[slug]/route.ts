import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { isUsernameTaken } from "@/lib/profiles";
import { sanitizeUsername, usernameProblem } from "@/lib/username";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/usernames/[slug]?exclude=<profileId>
 *
 * Live feedback for the admin form. Reports whether a slug is usable so the
 * form can say so while somebody types, instead of making them submit to find
 * out. `exclude` lets a profile keep its own username while being edited.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  try {
    const { slug } = await params;
    const candidate = sanitizeUsername(slug);

    if (!candidate) {
      return NextResponse.json({ available: false, username: "" });
    }

    // A malformed slug is a form problem, not a server error, so answer 200
    // with the reason rather than a 4xx the client has to special-case.
    const problem = usernameProblem(candidate);
    if (problem) {
      return NextResponse.json({ available: false, username: candidate, problem });
    }

    const exclude = new URL(request.url).searchParams.get("exclude") ?? undefined;
    const taken = await isUsernameTaken(candidate, exclude);

    return NextResponse.json({
      available: !taken,
      username: candidate,
      ...(taken ? { problem: `"${candidate}" is already taken.` } : {}),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not check that username.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}