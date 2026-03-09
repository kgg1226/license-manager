// 신규: 회사(OrgCompany) 목록 조회 및 생성 API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, handlePrismaError, vStrReq } from "@/lib/validation";

// GET /api/org/companies — 회사 목록 (하위 orgs 중첩 포함)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const companies = await prisma.orgCompany.findMany({
      include: {
        orgs: {
          include: {
            children: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    return NextResponse.json({ error: "회사 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/org/companies — 회사 생성 { name }
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();

    // ── 입력 검증 ──
    const nameVal = vStrReq(body.name, "회사명", 200);

    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.orgCompany.create({
        data: { name: nameVal },
      });

      await writeAuditLog(tx, {
        entityType: "ORG_COMPANY",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: created.name },
      });

      return created;
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, { uniqueMessage: "이미 존재하는 회사명입니다." });
    if (pErr) return pErr;
    console.error("Failed to create company:", error);
    return NextResponse.json({ error: "회사 생성에 실패했습니다." }, { status: 500 });
  }
}
