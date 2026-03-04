import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/licenses/:id/renewal-history — 갱신 이력 조회 (최신순)
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const licenseId = Number(id);

    const exists = await prisma.license.findUnique({
      where: { id: licenseId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "라이선스를 찾을 수 없습니다." }, { status: 404 });
    }

    const histories = await prisma.licenseRenewalHistory.findMany({
      where: { licenseId },
      orderBy: { changedAt: "desc" },
    });

    return NextResponse.json(histories);
  } catch (error) {
    console.error("Failed to fetch renewal history:", error);
    return NextResponse.json({ error: "갱신 이력 조회에 실패했습니다." }, { status: 500 });
  }
}
