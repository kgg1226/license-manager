import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, handlePrismaError, vEnumReq, vStr } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const VALID_RENEWAL_STATUSES = ["BEFORE_RENEWAL", "IN_PROGRESS", "NOT_RENEWING", "RENEWED"] as const;
type RenewalStatus = (typeof VALID_RENEWAL_STATUSES)[number];

// PUT /api/licenses/:id/renewal-status — 갱신 상태 변경
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const licenseId = Number(id);
    const body = await request.json();

    // ── 입력 검증 ──
    const toStatus = vEnumReq<RenewalStatus>(body.status, "status", VALID_RENEWAL_STATUSES);
    const memoVal = vStr(body.memo, 2000);

    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      select: { id: true, renewalStatus: true },
    });

    if (!license) {
      return NextResponse.json({ error: "라이선스를 찾을 수 없습니다." }, { status: 404 });
    }

    const fromStatus = license.renewalStatus as RenewalStatus;

    await prisma.$transaction(async (tx) => {
      await tx.license.update({
        where: { id: licenseId },
        data: { renewalStatus: toStatus },
      });

      await tx.licenseRenewalHistory.create({
        data: {
          licenseId,
          fromStatus,
          toStatus,
          actorType: "USER",
          actorId: user.id,
          memo: memoVal,
        },
      });

      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: licenseId,
        action: "RENEWAL_STATUS_CHANGED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { fromStatus, toStatus, memo: memoVal },
      });
    });

    return NextResponse.json({ success: true, renewalStatus: toStatus });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to update renewal status:", error);
    return NextResponse.json({ error: "갱신 상태 변경에 실패했습니다." }, { status: 500 });
  }
}
