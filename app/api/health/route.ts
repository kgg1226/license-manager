import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const startTime = Date.now();

// GET /api/health — 헬스체크 엔드포인트
export async function GET() {
  const uptimeMs = Date.now() - startTime;

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      db: "connected",
      uptime: Math.floor(uptimeMs / 1000),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        uptime: Math.floor(uptimeMs / 1000),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
