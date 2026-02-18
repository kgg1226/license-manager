import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/seats/:id — update seat key
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const seatId = Number(id);
    const body = await request.json();
    const newKey: string | null = body.key?.trim() || null;

    // Duplicate check
    if (newKey) {
      const existing = await prisma.licenseSeat.findUnique({
        where: { key: newKey },
        select: { id: true, license: { select: { name: true } } },
      });

      if (existing && existing.id !== seatId) {
        return NextResponse.json(
          { error: `키가 이미 "${existing.license.name}"에 등록되어 있습니다.` },
          { status: 409 }
        );
      }
    }

    const seat = await prisma.$transaction(async (tx) => {
      const oldSeat = await tx.licenseSeat.findUnique({
        where: { id: seatId },
        select: { key: true, licenseId: true, license: { select: { name: true } } },
      });

      const updated = await tx.licenseSeat.update({
        where: { id: seatId },
        data: { key: newKey },
      });

      if (oldSeat && oldSeat.key !== newKey) {
        await writeAuditLog(tx, {
          entityType: "SEAT",
          entityId: seatId,
          action: "UPDATED",
          actor: user.username,
          details: {
            summary: `${oldSeat.license.name} 시트 키 변경`,
            licenseId: oldSeat.licenseId,
            changes: { key: { from: oldSeat.key, to: newKey } },
          },
        });
      }

      return updated;
    });

    return NextResponse.json(seat);
  } catch (error) {
    console.error("Failed to update seat:", error);
    return NextResponse.json(
      { error: "시트 키 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
