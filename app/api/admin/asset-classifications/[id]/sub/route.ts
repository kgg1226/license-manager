// 자산 분류 체계 — 소분류 조회/생성 (특정 대분류 하위)
// GET  /api/admin/asset-classifications/[id]/sub — 소분류 목록
// POST /api/admin/asset-classifications/[id]/sub — 소분류 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const majorId = Number(id);

  const subs = await prisma.assetSubCategory.findMany({
    where: { majorCategoryId: majorId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { assets: true } } },
  });
  return NextResponse.json(subs);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  const { id } = await params;
  const majorId = Number(id);

  try {
    // 대분류 존재 확인
    const major = await prisma.assetMajorCategory.findUnique({ where: { id: majorId } });
    if (!major) return NextResponse.json({ error: "대분류를 찾을 수 없습니다." }, { status: 404 });

    const body = await request.json();
    const { name, code, isIsmsTarget, isConsultingTarget, description, sortOrder } = body;

    if (!name?.trim()) return NextResponse.json({ error: "소분류명은 필수입니다." }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "코드는 필수입니다." }, { status: 400 });

    const maxSort = await prisma.assetSubCategory.aggregate({
      where: { majorCategoryId: majorId },
      _max: { sortOrder: true },
    });

    const sub = await prisma.assetSubCategory.create({
      data: {
        majorCategoryId: majorId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        isIsmsTarget: isIsmsTarget ?? false,
        isConsultingTarget: isConsultingTarget ?? false,
        description: description?.trim() || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    await writeAuditLog(prisma, {
      entityType: "ASSET_SUB_CATEGORY",
      entityId: sub.id,
      action: "CREATED",
      actor: user.username,
      details: { summary: `소분류 ${sub.name}(${sub.code}) 생성 (대분류: ${major.name})` },
    });

    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 소분류 코드입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "소분류 생성에 실패했습니다." }, { status: 500 });
  }
}
