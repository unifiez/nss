import { NextResponse } from "next/server";
import { qrPngBuffer, qrSvg } from "@/lib/qr";
import { getProfile } from "@/lib/profiles";
import { requireAdmin } from "@/lib/require-admin";
import { getProfileUrlFor } from "@/lib/request-site-url";

export const dynamic = "force-dynamic";

/** Only allow sizes we are willing to render. An unbounded width would let a
 *  caller ask for a 40000px PNG and pin the server's memory. */
const PNG_SIZES = new Set([512, 1024, 2048, 4096]);
const DEFAULT_PNG_SIZE = 2048;

/** Slugify the profile name into something safe for a Content-Disposition filename. */
function fileStem(name: string, id: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
  return slug || id;
}

/**
 * GET /api/admin/qr/[id]?format=svg|png&size=2048&download=1
 *
 * `format=svg` (default) returns vector artwork for print. `format=png` returns
 * a raster at `size` pixels square. `download=1` forces a save rather than an
 * inline view.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  try {
    const { id } = await params;
    const profile = await getProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const search = new URL(request.url).searchParams;
    const format = search.get("format") === "png" ? "png" : "svg";
    const download = search.get("download") === "1";
    const target = await getProfileUrlFor(profile);
    const stem = fileStem(profile.name, profile.id);

    if (format === "png") {
      const requested = Number(search.get("size"));
      const size = PNG_SIZES.has(requested) ? requested : DEFAULT_PNG_SIZE;
      const buffer = await qrPngBuffer(target, profile.mainColor, size);

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "content-type": "image/png",
          "cache-control": "no-store",
          ...(download
            ? { "content-disposition": `attachment; filename="nss-${stem}-${size}.png"` }
            : {}),
        },
      });
    }

    const svg = await qrSvg(target, profile.mainColor);

    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "no-store",
        ...(download
          ? { "content-disposition": `attachment; filename="nss-${stem}.svg"` }
          : {}),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not build QR code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}