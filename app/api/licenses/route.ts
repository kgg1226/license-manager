import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSeats } from "@/lib/license-seats";
import { writeAuditLog } from "@/lib/audit-log";
import {
  computeCost,
  VALID_PAYMENT_CYCLES,
  VALID_CURRENCIES,
  type PaymentCycle,
  type Currency,
} from "@/lib/cost-calculator";
import {
  ValidationError, handleValidationError, handlePrismaError,
  vStrReq, vStr, vNumReq, vNum, vDateReq, vDate, vEnumReq, vEnum, vBool,
} from "@/lib/validation";

const VALID_LICENSE_TYPES = ["NO_KEY", "KEY_BASED", "VOLUME"] as const;
type LicenseType = (typeof VALID_LICENSE_TYPES)[number];

// GET /api/licenses — 라이선스 목록 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const licenses = await prisma.license.findMany({
      include: {
        assignments: {
          where: { returnedDate: null },
        },
        seats: {
          select: { id: true, key: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = licenses.map((license) => ({
      ...license,
      assignedQuantity: license.assignments.length,
      remainingQuantity: license.totalQuantity - license.assignments.length,
      missingKeyCount: license.licenseType === "KEY_BASED"
        ? license.seats.filter((s) => s.key === null).length
        : 0,
      assignments: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch licenses:", error);
    return NextResponse.json(
      { error: "라이선스 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/licenses — 라이선스 등록
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const body = await request.json();

    // ── 입력 검증 ──
    const nameVal = vStrReq(body.name, "라이선스명", 200);
    const licenseType = vEnumReq<LicenseType>(body.licenseType, "licenseType", VALID_LICENSE_TYPES);
    const qty = vNumReq(body.totalQuantity, "totalQuantity", { min: 1, integer: true });
    const purchaseDateVal = vDateReq(body.purchaseDate, "purchaseDate");
    const expiryDateVal = vDate(body.expiryDate);
    const priceVal = vNum(body.price, { min: 0 });
    const noticeDays = vNum(body.noticePeriodDays, { min: 0, max: 3650, integer: true });
    const keyVal = vStr(body.key, 500);
    const adminNameVal = vStr(body.adminName, 200);
    const descriptionVal = vStr(body.description, 2000);

    // 날짜 순서 검증
    if (expiryDateVal && expiryDateVal < purchaseDateVal) {
      throw new ValidationError("만료일은 구매일 이후여야 합니다.");
    }

    // 비용 필드 검증
    const paymentCycle = vEnum<PaymentCycle>(body.paymentCycle, VALID_PAYMENT_CYCLES);
    const billingQty = vNum(body.quantity, { min: 1, integer: true });
    const unitPriceVal = vNum(body.unitPrice, { min: 0 });
    const currency = vEnum<Currency>(body.currency, VALID_CURRENCIES) ?? "KRW";
    const exchangeRate = vNum(body.exchangeRate, { min: 0.0001 }) ?? 1.0;

    let totalAmountForeign: number | null = null;
    let totalAmountKRW: number | null = null;
    if (paymentCycle && billingQty != null && unitPriceVal != null) {
      const result = computeCost({
        paymentCycle,
        quantity: billingQty,
        unitPrice: unitPriceVal,
        currency,
        exchangeRate,
        isVatIncluded: vBool(body.isVatIncluded),
      });
      totalAmountForeign = result.totalAmountForeign;
      totalAmountKRW = result.totalAmountKRW;
    }

    const license = await prisma.$transaction(async (tx) => {
      const created = await tx.license.create({
        data: {
          name: nameVal,
          key: licenseType === "VOLUME" ? (keyVal || null) : null,
          licenseType,
          totalQuantity: qty,
          price: priceVal,
          purchaseDate: purchaseDateVal,
          expiryDate: expiryDateVal,
          noticePeriodDays: noticeDays,
          adminName: adminNameVal,
          description: descriptionVal,
          paymentCycle,
          quantity: billingQty,
          unitPrice: unitPriceVal,
          currency,
          exchangeRate,
          isVatIncluded: vBool(body.isVatIncluded),
          totalAmountForeign,
          totalAmountKRW,
        },
      });

      if (licenseType === "KEY_BASED") {
        await syncSeats(tx, created.id, qty);
      }

      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: created.name, licenseType: created.licenseType, totalQuantity: qty },
      });

      return created;
    });

    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to create license:", error);
    return NextResponse.json(
      { error: "라이선스 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
