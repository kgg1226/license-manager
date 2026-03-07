// BE-ORG-001: PUT — 회사 이름 수정
// BE-ORG-002: DELETE — 회사 삭제

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  handleValidationError,
  handlePrismaError,
  vStrReq,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// ── PUT /api/org/companies/[id] — 회사 이름 수정 ──

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();

    // ── 입력 검증 ──
    const nameVal = vStrReq(body.name, "회사명", 200);

    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.orgCompany.update({
        where: { id: Number(id) },
        data: { name: nameVal },
      });

      await writeAuditLog(tx, {
        entityType: "ORG_COMPANY",
        entityId: updated.id,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: updated.name },
      });

      return updated;
    });

    return NextResponse.json({
      id: company.id,
      name: company.name,
      updatedAt: company.createdAt,
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, {
      uniqueMessage: "이미 존재하는 회사명입니다.",
      notFoundMessage: "회사를 찾을 수 없습니다.",
    });
    if (pErr) return pErr;
    console.error("Failed to update company:", error);
    return NextResponse.json(
      { error: "회사 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── DELETE /api/org/companies/[id] — 회사 삭제 ──

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const companyId = Number(id);

    // 회사 존재 확인
    const company = await prisma.orgCompany.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "회사를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 소속 부서 존재 여부 확인 — 있으면 삭제 불가
    const unitCount = await prisma.orgUnit.count({
      where: { companyId },
    });
    if (unitCount > 0) {
      return NextResponse.json(
        { error: "소속 부서가 있어 삭제할 수 없습니다." },
        { status: 409 },
      );
    }

    // 삭제 + AuditLog (트랜잭션)
    await prisma.$transaction(async (tx) => {
      await tx.orgCompany.delete({
        where: { id: companyId },
      });

      await writeAuditLog(tx, {
        entityType: "ORG_COMPANY",
        entityId: companyId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: company.name },
      });
    });

    return NextResponse.json({ message: "회사가 삭제되었습니다." });
  } catch (error) {
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to delete company:", error);
    return NextResponse.json(
      { error: "회사 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
