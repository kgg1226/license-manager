// 자산 분류 체계 — 소분류 수정/삭제
// PUT    /api/admin/asset-classifications/sub/[id]
// DELETE /api/admin/asset-classifications/sub/[id]

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  const { id } = await params;
  const subId = Number(id);

  try {
    const body = await request.json();
    const { name, code, isIsmsTarget, isConsultingTarget, description, sortOrder, isActive } = body;

    if (!name?.trim()) return NextResponse.json({ error: "소분류명은 필수입니다." }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "코드는 필수입니다." }, { status: 400 });

    const sub = await prisma.assetSubCategory.update({
      where: { id: subId },
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        ...(typeof isIsmsTarget === "boolean" ? { isIsmsTarget } : {}),
        ...(typeof isConsultingTarget === "boolean" ? { isConsultingTarget } : {}),
        description: description?.trim() || null,
        ...(typeof sortOrder === "number" ? { sortOrder } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      include: { majorCategory: { select: { name: true } } },
    });

    await writeAuditLog(prisma, {
      entityType: "ASSET_SUB_CATEGORY",
      entityId: sub.id,
      action: "UPDATED",
      actor: user.username,
      details: { summary: `소분류 ${sub.name}(${sub.code}) 수정` },
    });

    return NextResponse.json(sub);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "소분류를 찾을 수 없습니다." }, { status: 404 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 소분류 코드입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "소분류 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  const { id } = await params;
  const subId = Number(id);

  try {
    // 연결된 자산이 있으면 삭제 불가
    const assetCount = await prisma.asset.count({ where: { subCategoryId: subId } });
    if (assetCount > 0) {
      return NextResponse.json(
        { error: `이 소분류에 연결된 자산이 ${assetCount}개 있습니다. 먼저 자산을 이동하세요.` },
        { status: 409 }
      );
    }

    const sub = await prisma.assetSubCategory.delete({
      where: { id: subId },
      include: { majorCategory: { select: { name: true } } },
    });

    await writeAuditLog(prisma, {
      entityType: "ASSET_SUB_CATEGORY",
      entityId: subId,
      action: "DELETED",
      actor: user.username,
      details: { summary: `소분류 ${sub.name}(${sub.code}) 삭제 (대분류: ${sub.majorCategory.name})` },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "소분류를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ error: "소분류 삭제에 실패했습니다." }, { status: 500 });
  }
}
