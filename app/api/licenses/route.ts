import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSeats } from "@/lib/license-seats";
import {
  computeCost,
  VALID_PAYMENT_CYCLES,
  VALID_CURRENCIES,
  type PaymentCycle,
  type Currency,
} from "@/lib/cost-calculator";

const VALID_LICENSE_TYPES = ["NO_KEY", "KEY_BASED", "VOLUME"] as const;
type LicenseType = typeof VALID_LICENSE_TYPES[number];

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
  try {
    const body = await request.json();
    const {
      name, key, totalQuantity, price, purchaseDate, expiryDate,
      noticePeriodDays, adminName, description,
      paymentCycle: paymentCycleRaw, quantity: billingQty, unitPrice,
      currency: currencyRaw, exchangeRate: exchangeRateRaw, isVatIncluded,
    } = body;

    if (!name || totalQuantity === undefined || !purchaseDate) {
      return NextResponse.json(
        { error: "name, totalQuantity, purchaseDate는 필수입니다." },
        { status: 400 }
      );
    }

    const licenseType: LicenseType = VALID_LICENSE_TYPES.includes(body.licenseType)
      ? body.licenseType
      : "KEY_BASED";
    const qty = Number(totalQuantity);

    const paymentCycle = VALID_PAYMENT_CYCLES.includes(paymentCycleRaw)
      ? (paymentCycleRaw as PaymentCycle)
      : null;
    const currency = VALID_CURRENCIES.includes(currencyRaw)
      ? (currencyRaw as Currency)
      : "KRW";
    const exchangeRate = exchangeRateRaw != null ? Number(exchangeRateRaw) : 1.0;

    let totalAmountForeign: number | null = null;
    let totalAmountKRW: number | null = null;
    if (paymentCycle && billingQty != null && unitPrice != null) {
      const result = computeCost({
        paymentCycle,
        quantity: Number(billingQty),
        unitPrice: Number(unitPrice),
        currency,
        exchangeRate: exchangeRate > 0 ? exchangeRate : 1,
        isVatIncluded: Boolean(isVatIncluded),
      });
      totalAmountForeign = result.totalAmountForeign;
      totalAmountKRW = result.totalAmountKRW;
    }

    const license = await prisma.$transaction(async (tx) => {
      const created = await tx.license.create({
        data: {
          name,
          key: licenseType === "VOLUME" ? (key || null) : null,
          licenseType,
          totalQuantity: qty,
          price: price != null ? Number(price) : null,
          purchaseDate: new Date(purchaseDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          noticePeriodDays: noticePeriodDays != null ? Number(noticePeriodDays) : null,
          adminName: adminName || null,
          description: description || null,
          paymentCycle,
          quantity: billingQty != null ? Number(billingQty) : null,
          unitPrice: unitPrice != null ? Number(unitPrice) : null,
          currency,
          exchangeRate,
          isVatIncluded: Boolean(isVatIncluded),
          totalAmountForeign,
          totalAmountKRW,
        },
      });

      if (licenseType === "KEY_BASED") {
        await syncSeats(tx, created.id, qty);
      }

      return created;
    });

    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    console.error("Failed to create license:", error);
    return NextResponse.json(
      { error: "라이선스 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
