"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { syncSeats } from "@/lib/license-seats";
import { writeAuditLog } from "@/lib/audit-log";
import {
  computeCost,
  VALID_PAYMENT_CYCLES,
  VALID_CURRENCIES,
  type PaymentCycle,
  type Currency,
} from "@/lib/cost-calculator";

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
};

const VALID_LICENSE_TYPES = ["NO_KEY", "KEY_BASED", "VOLUME"] as const;
type LicenseType = typeof VALID_LICENSE_TYPES[number];

export async function createLicense(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name") as string;
  const key = formData.get("key") as string;
  const licenseType = (formData.get("licenseType") as string) || "KEY_BASED";
  const totalQuantity = formData.get("totalQuantity") as string;
  const price = formData.get("price") as string;
  const purchaseDate = formData.get("purchaseDate") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const noticePeriodType = formData.get("noticePeriodType") as string;
  const noticePeriodCustom = formData.get("noticePeriodCustom") as string;
  const adminName = formData.get("adminName") as string;
  const description = formData.get("description") as string;

  // Cost fields
  const paymentCycleRaw = formData.get("paymentCycle") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unitPriceRaw = formData.get("unitPrice") as string;
  const currencyRaw = formData.get("currency") as string;
  const exchangeRateRaw = formData.get("exchangeRate") as string;
  const isVatIncludedRaw = formData.get("isVatIncluded") as string;

  // Validation
  const errors: Record<string, string> = {};

  if (!name.trim()) {
    errors.name = "라이선스명은 필수입니다.";
  }

  if (!VALID_LICENSE_TYPES.includes(licenseType as LicenseType)) {
    errors.licenseType = "올바른 라이선스 유형을 선택하세요.";
  }

  if (!totalQuantity || isNaN(Number(totalQuantity)) || Number(totalQuantity) < 1) {
    errors.totalQuantity = "수량은 1 이상의 숫자를 입력하세요.";
  }

  if (price && (isNaN(Number(price)) || Number(price) < 0)) {
    errors.price = "금액은 0 이상의 숫자를 입력하세요.";
  }

  // Cost field validation
  const billingQty = quantityRaw ? Number(quantityRaw) : null;
  const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : null;
  const exchangeRate = exchangeRateRaw ? Number(exchangeRateRaw) : 1.0;
  const isVatIncluded = isVatIncludedRaw === "true";
  const paymentCycle = VALID_PAYMENT_CYCLES.includes(paymentCycleRaw as PaymentCycle)
    ? (paymentCycleRaw as PaymentCycle)
    : null;
  const currency = VALID_CURRENCIES.includes(currencyRaw as Currency)
    ? (currencyRaw as Currency)
    : "KRW";

  if (billingQty !== null && (isNaN(billingQty) || billingQty < 1)) {
    errors.quantity = "결제 수량은 1 이상의 숫자를 입력하세요.";
  }
  if (unitPrice !== null && (isNaN(unitPrice) || unitPrice < 0)) {
    errors.unitPrice = "단가는 0 이상의 숫자를 입력하세요.";
  }
  if (isNaN(exchangeRate) || exchangeRate <= 0) {
    errors.exchangeRate = "환율은 0보다 큰 숫자를 입력하세요.";
  }

  if (!purchaseDate) {
    errors.purchaseDate = "구매일은 필수입니다.";
  }

  // Resolve notice period days
  let noticePeriodDays: number | null = null;
  if (noticePeriodType === "30") {
    noticePeriodDays = 30;
  } else if (noticePeriodType === "90") {
    noticePeriodDays = 90;
  } else if (noticePeriodType === "custom") {
    const days = Number(noticePeriodCustom);
    if (!noticePeriodCustom || isNaN(days) || days < 1) {
      errors.noticePeriodCustom = "1 이상의 일수를 입력하세요.";
    } else {
      noticePeriodDays = days;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const qty = Number(totalQuantity);
  const type = licenseType as LicenseType;

  // Compute stored totals if billing inputs are provided
  let totalAmountForeign: number | null = null;
  let totalAmountKRW: number | null = null;
  if (
    billingQty !== null &&
    unitPrice !== null &&
    !isNaN(billingQty) &&
    !isNaN(unitPrice) &&
    paymentCycle
  ) {
    const result = computeCost({
      paymentCycle,
      quantity: billingQty,
      unitPrice,
      currency,
      exchangeRate: isNaN(exchangeRate) ? 1 : exchangeRate,
      isVatIncluded,
    });
    totalAmountForeign = result.totalAmountForeign;
    totalAmountKRW = result.totalAmountKRW;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const license = await tx.license.create({
        data: {
          name: name.trim(),
          key: type === "VOLUME" ? (key?.trim() || null) : null,
          licenseType: type,
          totalQuantity: qty,
          price: price ? Number(price) : null,
          purchaseDate: new Date(purchaseDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          noticePeriodDays,
          adminName: adminName?.trim() || null,
          description: description?.trim() || null,
          paymentCycle,
          quantity: billingQty !== null && !isNaN(billingQty) ? billingQty : null,
          unitPrice: unitPrice !== null && !isNaN(unitPrice) ? unitPrice : null,
          currency,
          exchangeRate: isNaN(exchangeRate) ? 1.0 : exchangeRate,
          isVatIncluded,
          totalAmountForeign,
          totalAmountKRW,
        },
      });

      if (type === "KEY_BASED") {
        await syncSeats(tx, license.id, qty);
      }

      const typeLabel = type === "VOLUME" ? "볼륨" : type === "NO_KEY" ? "키없음" : "개별";
      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: license.id,
        action: "CREATED",
        details: {
          summary: `${name.trim()} 등록 (수량: ${qty}, ${typeLabel})`,
        },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "라이선스 등록에 실패했습니다.";
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE constraint")) {
      return { errors: { name: "이미 사용 중인 라이선스명입니다." } };
    }
    return { message: msg };
  }

  redirect("/licenses");
}
