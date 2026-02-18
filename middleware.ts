import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "session_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === "/login" || pathname.startsWith("/api/auth/");

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!isPublicPath && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && sessionToken) {
    return NextResponse.redirect(new URL("/licenses", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
