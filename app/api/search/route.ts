import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/search?q=keyword&limit=5 — 통합 검색 (라이선스 + 자산 + 조직원, 인증 필수)
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const limit = Math.min(10, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "5")));

    if (!q || q.length < 1) {
      return NextResponse.json({ licenses: [], assets: [], employees: [] });
    }

    const search = { contains: q, mode: "insensitive" as const };

    const [licenses, assets, employees] = await Promise.all([
      prisma.license.findMany({
        where: { OR: [{ name: search }, { adminName: search }] },
        select: { id: true, name: true, licenseType: true, expiryDate: true },
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.asset.findMany({
        where: { OR: [{ name: search }, { vendor: search }] },
        select: { id: true, name: true, type: true, status: true },
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        where: { OR: [{ name: search }, { email: search }, { department: search }] },
        select: { id: true, name: true, department: true, email: true, status: true },
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ licenses, assets, employees });
  } catch (error) {
    console.error("Search failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
