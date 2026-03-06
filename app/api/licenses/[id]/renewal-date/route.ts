import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, handlePrismaError, vDate } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PUT /api/licenses/:id/renewal-date — 갱신일 수동 설정 (null이면 자동 계산 복원)
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const licenseId = Number(id);
    const body = await request.json();

    // ── 입력 검증 ──
    const manualDate = vDate(body.renewalDateManual);

    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      select: { id: true, renewalStatus: true },
    });
    if (!license) {
      return NextResponse.json({ error: "라이선스를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.license.update({
        where: { id: licenseId },
        data: { renewalDateManual: manualDate },
      });

      await tx.licenseRenewalHistory.create({
        data: {
          licenseId,
          fromStatus: license.renewalStatus,
          toStatus: license.renewalStatus,
          actorType: "USER",
          actorId: user.id,
          memo: manualDate ? `갱신일 수동 변경: ${manualDate.toISOString()}` : "갱신일 수동 설정 해제 (자동 계산 복원)",
        },
      });

      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: licenseId,
        action: "RENEWAL_DATE_SET",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { renewalDateManual: manualDate?.toISOString() ?? null },
      });
    });

    return NextResponse.json({
      renewalDate: manualDate?.toISOString() ?? null,
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to set renewal date:", error);
    return NextResponse.json({ error: "갱신일 설정에 실패했습니다." }, { status: 500 });
  }
}
