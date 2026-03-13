// 자산 분류 체계 — 대분류 CRUD
// GET  /api/admin/asset-classifications — 전체 분류 트리 조회
// POST /api/admin/asset-classifications — 대분류 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET() {
  await requireAdmin();
  const categories = await prisma.assetMajorCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      subCategories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { assets: true } } },
      },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  try {
    const body = await request.json();
    const { name, code, abbr, description, sortOrder } = body;

    if (!name?.trim()) return NextResponse.json({ error: "대분류명은 필수입니다." }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "코드는 필수입니다." }, { status: 400 });

    const maxSort = await prisma.assetMajorCategory.aggregate({ _max: { sortOrder: true } });

    const category = await prisma.assetMajorCategory.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        abbr: abbr?.trim() || null,
        description: description?.trim() || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    await writeAuditLog(prisma, {
      entityType: "ASSET_MAJOR_CATEGORY",
      entityId: category.id,
      action: "CREATED",
      actor: user.username,
      details: { summary: `대분류 ${category.name}(${category.code}) 생성` },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 대분류명 또는 코드입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "대분류 생성에 실패했습니다." }, { status: 500 });
  }
}
