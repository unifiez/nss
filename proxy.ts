import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, peekSession } from "@/lib/session-token";

/**
 * Optimistic guard only.
 *
 * Per the Next.js Proxy docs this runs before a request completes, so it just
 * answers "does this cookie look like a live session?". The authoritative
 * HMAC check happens in `app/admin/(protected)/layout.tsx`, which every admin
 * page renders behind. See lib/session-token.ts for the verified variant.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = peekSession(token);

  if (session) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  if (request.nextUrl.pathname !== "/admin/login") {
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything under /admin except the login screen itself.
  matcher: ["/admin", "/admin/((?!login).*)"],
};
