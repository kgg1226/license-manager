// 자산 분류 체계 — 대분류 수정/삭제
// PUT    /api/admin/asset-classifications/[id]
// DELETE /api/admin/asset-classifications/[id]

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
  const majorId = Number(id);

  try {
    const body = await request.json();
    const { name, code, abbr, description, sortOrder, isActive } = body;

    if (!name?.trim()) return NextResponse.json({ error: "대분류명은 필수입니다." }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "코드는 필수입니다." }, { status: 400 });

    const category = await prisma.assetMajorCategory.update({
      where: { id: majorId },
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        abbr: abbr?.trim() || null,
        description: description?.trim() || null,
        ...(typeof sortOrder === "number" ? { sortOrder } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    await writeAuditLog(prisma, {
      entityType: "ASSET_MAJOR_CATEGORY",
      entityId: category.id,
      action: "UPDATED",
      actor: user.username,
      details: { summary: `대분류 ${category.name}(${category.code}) 수정` },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "대분류를 찾을 수 없습니다." }, { status: 404 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 대분류명 또는 코드입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "대분류 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  const { id } = await params;
  const majorId = Number(id);

  try {
    // 소분류에 연결된 자산이 있으면 삭제 불가
    const assetCount = await prisma.asset.count({
      where: { subCategory: { majorCategoryId: majorId } },
    });
    if (assetCount > 0) {
      return NextResponse.json(
        { error: `이 대분류의 소분류에 연결된 자산이 ${assetCount}개 있습니다. 먼저 자산을 이동하세요.` },
        { status: 409 }
      );
    }

    const category = await prisma.assetMajorCategory.delete({ where: { id: majorId } });

    await writeAuditLog(prisma, {
      entityType: "ASSET_MAJOR_CATEGORY",
      entityId: majorId,
      action: "DELETED",
      actor: user.username,
      details: { summary: `대분류 ${category.name}(${category.code}) 삭제` },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "대분류를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ error: "대분류 삭제에 실패했습니다." }, { status: 500 });
  }
}
