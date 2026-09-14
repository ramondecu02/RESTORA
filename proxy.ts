import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { DEFAULT_LOCALE, isLocale } from "@/lib/types";

// Next 16 renamed `middleware` to `proxy` (runs on the Node.js runtime).
// Two jobs: (1) send "/" to a locale-prefixed home, (2) guard /<locale>/admin.

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (isLocale(cookie)) return cookie;
  const accept = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (accept.startsWith("ca")) return "ca";
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Locale redirect for the bare root.
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectLocale(request)}`;
    return NextResponse.redirect(url);
  }

  // 2. Admin auth guard: /<locale>/admin/** except the login page.
  const adminMatch = pathname.match(/^\/(es|ca)\/admin(\/.*)?$/);
  if (adminMatch) {
    const locale = adminMatch[1];
    const rest = adminMatch[2] ?? "";
    const isLoginRoute = rest === "/login";

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const authed = verifySessionToken(token);

    if (!authed && !isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/admin/login`;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // Already signed in? Skip the login page.
    if (authed && isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/admin/leads`;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/(es|ca)/admin/:path*"],
};
