import { getProfile } from "@/lib/profiles";
import { isDbConfigured } from "@/lib/db";

/**
 * Serves the base64 PNG stored on the profile document. Going through a route
 * (rather than inlining a data: URL) keeps `next/image` optimisation working
 * and lets the bytes be cached far longer than the page itself.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return new Response("Not found", { status: 404 });

  const { id } = await params;
  const profile = await getProfile(id).catch(() => null);

  if (!profile?.photo) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(profile.photo, "base64"), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=0, s-maxage=31536000, immutable",
    },
  });
}
