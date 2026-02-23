import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSeats, deleteAllSeats } from "@/lib/license-seats";
import {
  computeCost,
  VALID_PAYMENT_CYCLES,
  VALID_CURRENCIES,
  type PaymentCycle,
  type Currency,
} from "@/lib/cost-calculator";

type Params = { params: Promise<{ id: string }> };

const VALID_LICENSE_TYPES = ["NO_KEY", "KEY_BASED", "VOLUME"] as const;

// GET /api/licenses/:id — 라이선스 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const license = await prisma.license.findUnique({
      where: { id: Number(id) },
      include: {
        assignments: {
          include: { employee: true },
          orderBy: { assignedDate: "desc" },
        },
        seats: {
          include: {
            assignments: {
              where: { returnedDate: null },
              select: { employee: { select: { name: true } } },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: "라이선스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const activeAssignments = license.assignments.filter(
      (a) => a.returnedDate === null
    );

    return NextResponse.json({
      ...license,
      assignedQuantity: activeAssignments.length,
      remainingQuantity: license.totalQuantity - activeAssignments.length,
    });
  } catch (error) {
    console.error("Failed to fetch license:", error);
    return NextResponse.json(
      { error: "라이선스 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/licenses/:id — 라이선스 수정
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name, key, totalQuantity, price, purchaseDate, expiryDate,
      noticePeriodDays, adminName, description,
      paymentCycle: paymentCycleRaw, quantity: billingQty, unitPrice,
      currency: currencyRaw, exchangeRate: exchangeRateRaw, isVatIncluded,
    } = body;

    const licenseId = Number(id);
    const licenseType = VALID_LICENSE_TYPES.includes(body.licenseType)
      ? body.licenseType
      : undefined;

    // Cost fields
    const paymentCycle = VALID_PAYMENT_CYCLES.includes(paymentCycleRaw)
      ? (paymentCycleRaw as PaymentCycle)
      : undefined;
    const currency = VALID_CURRENCIES.includes(currencyRaw)
      ? (currencyRaw as Currency)
      : undefined;
    const exchangeRate = exchangeRateRaw != null ? Number(exchangeRateRaw) : undefined;

    let totalAmountForeign: number | null | undefined = undefined;
    let totalAmountKRW: number | null | undefined = undefined;
    if (paymentCycle && billingQty != null && unitPrice != null) {
      const result = computeCost({
        paymentCycle,
        quantity: Number(billingQty),
        unitPrice: Number(unitPrice),
        currency: currency ?? "KRW",
        exchangeRate: exchangeRate != null && exchangeRate > 0 ? exchangeRate : 1,
        isVatIncluded: Boolean(isVatIncluded),
      });
      totalAmountForeign = result.totalAmountForeign;
      totalAmountKRW = result.totalAmountKRW;
    } else if (billingQty === null || unitPrice === null) {
      totalAmountForeign = null;
      totalAmountKRW = null;
    }

    const license = await prisma.$transaction(async (tx) => {
      const existing = await tx.license.findUnique({
        where: { id: licenseId },
        select: { licenseType: true },
      });

      // Block type conversion if active assignments exist
      if (existing && licenseType !== undefined && existing.licenseType !== licenseType) {
        const activeAssignments = await tx.assignment.count({
          where: { licenseId, returnedDate: null },
        });
        if (activeAssignments > 0) {
          throw new Error(
            `활성 배정이 ${activeAssignments}건 있어 라이선스 유형을 변경할 수 없습니다. 먼저 모든 배정을 해제하세요.`
          );
        }
      }

      const newLicenseType = licenseType ?? existing?.licenseType;

      const updated = await tx.license.update({
        where: { id: licenseId },
        data: {
          ...(name !== undefined && { name }),
          ...(licenseType !== undefined && { licenseType }),
          ...(key !== undefined && { key: newLicenseType === "VOLUME" ? (key || null) : null }),
          ...(totalQuantity !== undefined && { totalQuantity: Number(totalQuantity) }),
          ...(price !== undefined && { price: price != null ? Number(price) : null }),
          ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
          ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
          ...(noticePeriodDays !== undefined && { noticePeriodDays: noticePeriodDays != null ? Number(noticePeriodDays) : null }),
          ...(adminName !== undefined && { adminName: adminName || null }),
          ...(description !== undefined && { description: description || null }),
          ...(paymentCycle !== undefined && { paymentCycle }),
          ...(billingQty !== undefined && { quantity: billingQty != null ? Number(billingQty) : null }),
          ...(unitPrice !== undefined && { unitPrice: unitPrice != null ? Number(unitPrice) : null }),
          ...(currency !== undefined && { currency }),
          ...(exchangeRate !== undefined && { exchangeRate }),
          ...(isVatIncluded !== undefined && { isVatIncluded: Boolean(isVatIncluded) }),
          ...(totalAmountForeign !== undefined && { totalAmountForeign }),
          ...(totalAmountKRW !== undefined && { totalAmountKRW }),
        },
      });

      if (existing && licenseType !== undefined) {
        const wasKeyBased = existing.licenseType === "KEY_BASED";
        const isKeyBased = licenseType === "KEY_BASED";

        if (wasKeyBased && !isKeyBased) {
          await deleteAllSeats(tx, licenseId);
        } else if (!wasKeyBased && isKeyBased) {
          await syncSeats(tx, licenseId, totalQuantity !== undefined ? Number(totalQuantity) : updated.totalQuantity);
        }
      }

      if (updated.licenseType === "KEY_BASED" && totalQuantity !== undefined) {
        await syncSeats(tx, licenseId, Number(totalQuantity));
      }

      return updated;
    });

    return NextResponse.json(license);
  } catch (error) {
    console.error("Failed to update license:", error);
    const message = error instanceof Error ? error.message : "라이선스 수정에 실패했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

// DELETE /api/licenses/:id — 라이선스 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.license.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "라이선스가 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete license:", error);
    return NextResponse.json(
      { error: "라이선스 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
