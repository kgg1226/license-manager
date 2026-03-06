import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handlePrismaError } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// POST /api/employees/:id/offboard — 퇴사 처리 (OFFBOARDING 7일 유예)
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const employeeId = Number(id);

    const existing = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "조직원을 찾을 수 없습니다." }, { status: 404 });
    }
    if (existing.status === "OFFBOARDING") {
      return NextResponse.json({ error: "이미 퇴사 처리 중인 구성원입니다." }, { status: 400 });
    }
    if (existing.status === "DELETED") {
      return NextResponse.json({ error: "이미 삭제된 구성원입니다." }, { status: 400 });
    }

    const offboardingUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: "OFFBOARDING",
          offboardingUntil,
        },
      });

      await writeAuditLog(tx, {
        entityType: "EMPLOYEE",
        entityId: employeeId,
        action: "MEMBER_OFFBOARD",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { offboardingUntil: offboardingUntil.toISOString() },
      });
    });

    return NextResponse.json({ success: true, offboardingUntil: offboardingUntil.toISOString() });
  } catch (error) {
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to offboard employee:", error);
    return NextResponse.json({ error: "퇴사 처리에 실패했습니다." }, { status: 500 });
  }
}
