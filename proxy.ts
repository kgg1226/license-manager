import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/cron"];

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

  // API 변경 요청(POST/PUT/PATCH/DELETE)만 인증 요구
  // GET 요청 및 모든 페이지는 비로그인 접근 허용
  if (!sessionToken && pathname.startsWith("/api/")) {
    const method = request.method;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }
  }

  return passthrough();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
