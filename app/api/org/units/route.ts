// 신규: 조직 단위(OrgUnit) 목록 조회 및 생성 API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, vStrReq, vNumReq, vNum } from "@/lib/validation";

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
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();

    // ── 입력 검증 ──
    const nameVal = vStrReq(body.name, "조직명", 200);
    const companyIdVal = vNumReq(body.companyId, "companyId", { min: 1, integer: true });
    const parentIdVal = vNum(body.parentId, { min: 1, integer: true });
    const sortOrderVal = vNum(body.sortOrder, { min: 0, max: 9999, integer: true });

    const unit = await prisma.$transaction(async (tx) => {
      const created = await tx.orgUnit.create({
        data: {
          name: nameVal,
          companyId: companyIdVal,
          parentId: parentIdVal,
          ...(sortOrderVal !== null && { sortOrder: sortOrderVal }),
        },
      });

      await writeAuditLog(tx, {
        entityType: "ORG_UNIT",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: created.name, companyId: created.companyId, parentId: created.parentId },
      });

      return created;
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to create org unit:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 존재하는 부서명입니다" }, { status: 409 });
    }
    return NextResponse.json({ error: "조직 생성에 실패했습니다." }, { status: 500 });
  }
}
