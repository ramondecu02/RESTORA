// Primera barrera: sin cookie de sesión, las rutas de la app mandan a /entrar.
// La comprobación real (sesión válida, negocio, rol) se hace en cada página y acción.
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = [/^\/entrar/, /^\/registro/, /^\/recuperar/, /^\/restablecer/, /^\/invitacion\//, /^\/api\/stripe\/webhook/, /^\/api\/salud/, /^\/dev\/correo/];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const has = req.cookies.has("__Host-rs_sess") || req.cookies.has("rs_sess");
  if (!has) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "no_session" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|demo/|icon.svg|favicon.ico|robots.txt).*)"],
};
