"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { syncSeats, deleteAllSeats } from "@/lib/license-seats";
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

export async function updateLicense(
  id: number,
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

  const errors: Record<string, string> = {};

  if (!name?.trim()) {
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
      const existing = await tx.license.findUnique({
        where: { id },
        select: {
          name: true,
          key: true,
          licenseType: true,
          totalQuantity: true,
          price: true,
          purchaseDate: true,
          expiryDate: true,
          noticePeriodDays: true,
          adminName: true,
          description: true,
        },
      });
      if (!existing) throw new Error("라이선스를 찾을 수 없습니다.");

      const wasKeyBased = existing.licenseType === "KEY_BASED";
      const isKeyBased = type === "KEY_BASED";

      // Block type conversion if active assignments exist
      if (existing.licenseType !== type) {
        const activeAssignments = await tx.assignment.count({
          where: { licenseId: id, returnedDate: null },
        });
        if (activeAssignments > 0) {
          throw new Error(
            `활성 배정이 ${activeAssignments}건 있어 라이선스 유형을 변경할 수 없습니다. 먼저 모든 배정을 해제하세요.`
          );
        }
      }

      const newData = {
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
      };

      await tx.license.update({ where: { id }, data: newData });

      // Build diff for audit log
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (existing.name !== newData.name) changes.name = { from: existing.name, to: newData.name };
      if (existing.totalQuantity !== newData.totalQuantity) changes.totalQuantity = { from: existing.totalQuantity, to: newData.totalQuantity };
      if (existing.licenseType !== newData.licenseType) changes.licenseType = { from: existing.licenseType, to: newData.licenseType };
      if ((existing.price ?? null) !== (newData.price ?? null)) changes.price = { from: existing.price, to: newData.price };
      if (existing.noticePeriodDays !== newData.noticePeriodDays) changes.noticePeriodDays = { from: existing.noticePeriodDays, to: newData.noticePeriodDays };
      if ((existing.adminName ?? null) !== (newData.adminName ?? null)) changes.adminName = { from: existing.adminName, to: newData.adminName };
      if ((existing.key ?? null) !== (newData.key ?? null)) changes.key = { from: existing.key, to: newData.key };

      if (Object.keys(changes).length > 0) {
        await writeAuditLog(tx, {
          entityType: "LICENSE",
          entityId: id,
          action: "UPDATED",
          details: {
            summary: `${newData.name} 수정`,
            changes,
          },
        });
      }

      // Seat sync based on type change
      if (wasKeyBased && !isKeyBased) {
        await deleteAllSeats(tx, id);
      } else if (!wasKeyBased && isKeyBased) {
        await syncSeats(tx, id, qty);
      } else if (isKeyBased) {
        await syncSeats(tx, id, qty);
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "라이선스 수정에 실패했습니다.";
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE constraint")) {
      return { errors: { name: "이미 사용 중인 라이선스명입니다." } };
    }
    return { message: msg };
  }

  redirect(`/licenses/${id}`);
}

export async function deleteLicense(id: number): Promise<FormState> {
  try {
    const license = await prisma.license.findUnique({
      where: { id },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: id,
        action: "DELETED",
        details: { summary: `${license?.name ?? id} 삭제` },
      });

      await tx.license.delete({ where: { id } });
    });
  } catch {
    return { message: "라이선스 삭제에 실패했습니다." };
  }

  redirect("/licenses");
}
