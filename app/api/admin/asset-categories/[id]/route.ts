// BE-047: AssetCategory CRUD — PUT / DELETE
// PUT  /api/admin/asset-categories/[id] — 수정
// DELETE /api/admin/asset-categories/[id] — 삭제

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
  const categoryId = Number(id);

  try {
    const body = await request.json();
    const { name, code, driveFolder, isActive } = body;

    if (!name?.trim()) return NextResponse.json({ error: "카테고리명은 필수입니다." }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "코드는 필수입니다." }, { status: 400 });

    const category = await prisma.assetCategory.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        driveFolder: driveFolder?.trim() || null,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    await writeAuditLog(prisma, {
      entityType: "ASSET_CATEGORY",
      entityId: category.id,
      action: "UPDATED",
      actor: user.username,
      details: { summary: `카테고리 ${category.name} 수정` },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 카테고리명 또는 코드입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "카테고리 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  const { id } = await params;
  const categoryId = Number(id);

  try {
    // 연결된 증적이 있으면 삭제 불가
    const archiveCount = await prisma.archive.count({
      where: { categoryId },
    });
    if (archiveCount > 0) {
      return NextResponse.json(
        { error: `이 카테고리에 연결된 증적이 ${archiveCount}개 있습니다. 먼저 삭제하세요.` },
        { status: 409 }
      );
    }

    const category = await prisma.assetCategory.delete({ where: { id: categoryId } });

    await writeAuditLog(prisma, {
      entityType: "ASSET_CATEGORY",
      entityId: categoryId,
      action: "DELETED",
      actor: user.username,
      details: { summary: `카테고리 ${category.name} 삭제` },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ error: "카테고리 삭제에 실패했습니다." }, { status: 500 });
  }
}
