// BE-HW-007: POST /api/cron/asset-disposal-check — PC 자산 폐기 대상 자동 판정
//
// PC 자산(Laptop/Desktop) 중 남은 내용연수가 1년 미만인 자산을
// 자동으로 PENDING_DISPOSAL 상태로 전환한다.
// 인증: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // PC 자산 (deviceType = Laptop/Desktop) 중 활성 상태인 자산 조회
    const pcAssets = await prisma.asset.findMany({
      where: {
        type: "HARDWARE",
        status: { in: ["IN_STOCK", "IN_USE", "INACTIVE"] },
        hardwareDetail: {
          deviceType: { in: ["Laptop", "Desktop"] },
        },
        purchaseDate: { not: null },
      },
      include: {
        hardwareDetail: {
          select: {
            deviceType: true,
            usefulLifeYears: true,
          },
        },
      },
    });

    let checked = 0;
    let updated = 0;
    const updatedAssets: { id: number; name: string; remainingDays: number }[] = [];

    for (const asset of pcAssets) {
      checked++;

      if (!asset.purchaseDate || !asset.hardwareDetail) continue;

      const usefulLifeYears = asset.hardwareDetail.usefulLifeYears;
      const purchaseDate = new Date(asset.purchaseDate);
      const endOfLifeDate = new Date(purchaseDate);
      endOfLifeDate.setDate(endOfLifeDate.getDate() + usefulLifeYears * 365);

      const remainingMs = endOfLifeDate.getTime() - now.getTime();
      const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));

      // 남은 일수 < 365일 → PENDING_DISPOSAL
      if (remainingDays < 365) {
        await prisma.$transaction(async (tx) => {
          await tx.asset.update({
            where: { id: asset.id },
            data: { status: "PENDING_DISPOSAL" },
          });

          await writeAuditLog(tx, {
            entityType: "ASSET",
            entityId: asset.id,
            action: "AUTO_DISPOSAL_CHECK",
            actorType: "SYSTEM",
            details: {
              previousStatus: asset.status,
              newStatus: "PENDING_DISPOSAL",
              remainingDays,
              reason: `남은 내용연수 ${remainingDays}일 (1년 미만) — 자동 폐기 대상 전환`,
            },
          });
        });

        updated++;
        updatedAssets.push({
          id: asset.id,
          name: asset.name,
          remainingDays,
        });
      }
    }

    console.log(
      `[cron/asset-disposal-check] 완료 (${now.toISOString()}) — 확인: ${checked}, 전환: ${updated}`,
    );

    return NextResponse.json({
      success: true,
      checked,
      updated,
      assets: updatedAssets,
    });
  } catch (error) {
    console.error("Failed to run asset disposal check:", error);
    return NextResponse.json(
      { error: "폐기 대상 자동 판정에 실패했습니다." },
      { status: 500 },
    );
  }
}
