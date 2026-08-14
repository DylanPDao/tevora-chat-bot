import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/server/auth.config";

/**
 * Route protection for page navigation.
 *
 * Built from `auth.config.ts` rather than `auth.ts` so the database driver
 * never enters the Edge bundle. This verifies the JWT's *signature* — not just
 * that a cookie exists — so a forged token is rejected here rather than being
 * waved through to a page that has to catch it.
 *
 * It is still not the security boundary. Every handler calls `auth()` and
 * scopes its queries by `session.user.id`; that is what stops one user reading
 * another's conversations. This file stops a signed-out visitor reaching a page
 * that would only render empty, and keeps a signed-in one off the login form.
 */
const { auth } = NextAuth(authConfig);

/**
 * Reachable without a session. Everything else the matcher covers needs one.
 *
 * Split by match type deliberately: `startsWith` on "/" would match every path
 * in the app and quietly make the whole thing public. The landing page is the
 * one route that has to be matched exactly.
 */
const PUBLIC_PREFIXES = ["/login", "/register"];
const PUBLIC_EXACT = ["/"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isSignedIn = Boolean(request.auth);
  const isPublic =
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((route) => pathname.startsWith(route));

  if (!isSignedIn && !isPublic) {
    const url = new URL("/login", request.url);
    // Carried so a deep link survives the bounce. The login form validates it
    // before redirecting — see `safeRedirectTarget` in use-login.ts.
    url.searchParams.set("from", pathname);

    return NextResponse.redirect(url);
  }

  if (isSignedIn && isPublic) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
});

export const config = {
  /**
   * `/api` is excluded deliberately, for three separate reasons: `/api/auth/*`
   * must stay reachable or sign-in deadlocks against its own redirect;
   * `/api/register` is public by definition; and every other handler
   * authenticates itself, which is the real check. Redirecting an API request
   * to an HTML login page would also turn a clean 401 into a parse error on the
   * client.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
