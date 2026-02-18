"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { syncSeats, deleteAllSeats } from "@/lib/license-seats";
import { writeAuditLog } from "@/lib/audit-log";

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function updateLicense(
  id: number,
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

  const errors: Record<string, string> = {};

  if (!name?.trim()) {
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

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.license.findUnique({
        where: { id },
        select: {
          name: true,
          key: true,
          isVolumeLicense: true,
          totalQuantity: true,
          price: true,
          purchaseDate: true,
          expiryDate: true,
          contractDate: true,
          noticePeriodDays: true,
          adminName: true,
          description: true,
        },
      });
      if (!existing) throw new Error("라이선스를 찾을 수 없습니다.");

      const wasVolume = existing.isVolumeLicense;

      // Risk 3: 유형 전환 시 활성 배정이 있으면 차단
      if (wasVolume !== isVolumeLicense) {
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
      };

      await tx.license.update({ where: { id }, data: newData });

      // Build diff for audit log
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (existing.name !== newData.name) changes.name = { from: existing.name, to: newData.name };
      if (existing.totalQuantity !== newData.totalQuantity) changes.totalQuantity = { from: existing.totalQuantity, to: newData.totalQuantity };
      if (existing.isVolumeLicense !== newData.isVolumeLicense) changes.isVolumeLicense = { from: existing.isVolumeLicense, to: newData.isVolumeLicense };
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

      if (!wasVolume && isVolumeLicense) {
        await deleteAllSeats(tx, id);
      } else if (wasVolume && !isVolumeLicense) {
        await syncSeats(tx, id, qty);
      } else if (!isVolumeLicense) {
        await syncSeats(tx, id, qty);
      }
    });
  } catch (e) {
    return { message: e instanceof Error ? e.message : "라이선스 수정에 실패했습니다." };
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
