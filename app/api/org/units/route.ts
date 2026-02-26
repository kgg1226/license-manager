// 신규: 조직 단위(OrgUnit) 목록 조회 및 생성 API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/org/units — OrgUnit 목록 (?companyId= 필터, ?parentId= 필터)
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const parentId = searchParams.get("parentId");

    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = Number(companyId);
    if (parentId === "null") {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = Number(parentId);
    }

    const units = await prisma.orgUnit.findMany({
      where,
      include: { children: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error("Failed to fetch org units:", error);
    return NextResponse.json({ error: "조직 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/org/units — 조직/하위조직 생성 { name, companyId, parentId? }
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    const { name, companyId, parentId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "조직명은 필수입니다." }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "companyId는 필수입니다." }, { status: 400 });
    }

    const unit = await prisma.orgUnit.create({
      data: {
        name: name.trim(),
        companyId: Number(companyId),
        parentId: parentId ? Number(parentId) : null,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error("Failed to create org unit:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "동일한 이름의 조직이 이미 존재합니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "조직 생성에 실패했습니다." }, { status: 500 });
  }
}
