import { NextRequest } from "next/server";

/**
 * CRON 요청 인증 검증
 * x-cron-secret 헤더 또는 Authorization: Bearer <CRON_SECRET> 확인
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  return token === secret;
}
