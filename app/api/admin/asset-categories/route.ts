// BE-047: AssetCategory CRUD API
// GET  /api/admin/asset-categories — 목록
// POST /api/admin/asset-categories — 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET() {
  await requireAdmin();
  const categories = await prisma.assetCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { archives: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  try {
    const body = await request.json();
    const { name, code, driveFolder } = body;

    if (!name?.trim()) return NextResponse.json({ error: "카테고리명은 필수입니다." }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "코드는 필수입니다." }, { status: 400 });

    const category = await prisma.assetCategory.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        driveFolder: driveFolder?.trim() || null,
      },
    });

    await writeAuditLog(prisma, {
      entityType: "ASSET_CATEGORY",
      entityId: category.id,
      action: "CREATED",
      actor: user.username,
      details: { summary: `카테고리 ${category.name} 생성` },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 카테고리명 또는 코드입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "카테고리 생성에 실패했습니다." }, { status: 500 });
  }
}
