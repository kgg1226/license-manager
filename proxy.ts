import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js internals and static files — no header needed
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Helper: pass through with x-pathname header so layout can read it
  const passthrough = () => {
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  };

  // Public paths — always allow
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return passthrough();
  }

  const sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return passthrough();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
