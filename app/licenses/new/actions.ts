"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { syncSeats } from "@/lib/license-seats";

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function createLicense(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name") as string;
  const key = formData.get("key") as string;
  const isVolumeLicense = formData.get("isVolumeLicense") === "on";
  const totalQuantity = formData.get("totalQuantity") as string;
  const price = formData.get("price") as string;
  const purchaseDate = formData.get("purchaseDate") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const contractDate = formData.get("contractDate") as string;
  const noticePeriodType = formData.get("noticePeriodType") as string;
  const noticePeriodCustom = formData.get("noticePeriodCustom") as string;
  const adminName = formData.get("adminName") as string;
  const description = formData.get("description") as string;

  // Validation
  const errors: Record<string, string> = {};

  if (!name.trim()) {
    errors.name = "라이선스명은 필수입니다.";
  }

  if (!totalQuantity || isNaN(Number(totalQuantity)) || Number(totalQuantity) < 1) {
    errors.totalQuantity = "수량은 1 이상의 숫자를 입력하세요.";
  }

  if (price && (isNaN(Number(price)) || Number(price) < 0)) {
    errors.price = "금액은 0 이상의 숫자를 입력하세요.";
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

  await prisma.$transaction(async (tx) => {
    const license = await tx.license.create({
      data: {
        name: name.trim(),
        key: isVolumeLicense ? (key?.trim() || null) : null,
        isVolumeLicense,
        totalQuantity: qty,
        price: price ? Number(price) : null,
        purchaseDate: new Date(purchaseDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        contractDate: contractDate ? new Date(contractDate) : null,
        noticePeriodDays,
        adminName: adminName?.trim() || null,
        description: description?.trim() || null,
      },
    });

    // Individual license: create seats
    if (!isVolumeLicense) {
      await syncSeats(tx, license.id, qty);
    }
  });

  redirect("/licenses");
}
