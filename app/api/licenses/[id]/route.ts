import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSeats, deleteAllSeats } from "@/lib/license-seats";
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
  vStr, vStrReq, vNum, vNumReq, vDate, vDateReq, vEnum, vEnumReq, vBool,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const VALID_LICENSE_TYPES = ["NO_KEY", "KEY_BASED", "VOLUME"] as const;
type LicenseType = (typeof VALID_LICENSE_TYPES)[number];

// GET /api/licenses/:id — 라이선스 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
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
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        assetLinks: {
          include: { asset: { select: { id: true, name: true, type: true, status: true } } },
          orderBy: { createdAt: "desc" },
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
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();
    const licenseId = Number(id);

    // ── 입력 검증 (모두 선택 필드 — undefined이면 수정 안 함) ──
    const nameVal = body.name !== undefined ? vStrReq(body.name, "라이선스명", 200) : undefined;
    const licenseType = body.licenseType !== undefined
      ? vEnumReq<LicenseType>(body.licenseType, "licenseType", VALID_LICENSE_TYPES) : undefined;
    const totalQuantity = body.totalQuantity !== undefined
      ? vNumReq(body.totalQuantity, "totalQuantity", { min: 1, integer: true }) : undefined;
    const priceVal = body.price !== undefined
      ? vNum(body.price, { min: 0 }) : undefined;
    const purchaseDateVal = body.purchaseDate !== undefined ? vDateReq(body.purchaseDate, "purchaseDate") : undefined;
    const expiryDateVal = body.expiryDate !== undefined ? vDate(body.expiryDate) : undefined;
    const noticeDays = body.noticePeriodDays !== undefined
      ? vNum(body.noticePeriodDays, { min: 0, max: 3650, integer: true }) : undefined;
    const keyVal = body.key !== undefined ? vStr(body.key, 500) : undefined;
    const adminNameVal = body.adminName !== undefined ? vStr(body.adminName, 200) : undefined;
    const descriptionVal = body.description !== undefined ? vStr(body.description, 2000) : undefined;

    // parentId 검증 (undefined면 수정 안 함, null이면 해제)
    const parentIdProvided = body.parentId !== undefined;
    const parentIdVal = parentIdProvided
      ? (body.parentId === null ? null : vNum(body.parentId, { min: 1, integer: true }))
      : undefined;

    // 순환 참조 + 자기 참조 검증
    if (parentIdVal != null) {
      if (parentIdVal === licenseId) {
        throw new ValidationError("자신을 상위 라이선스로 설정할 수 없습니다.");
      }
      // 상위 체인을 따라가며 순환 검사 (최대 10depth)
      let cursor = parentIdVal;
      for (let i = 0; i < 10; i++) {
        const ancestor = await prisma.license.findUnique({
          where: { id: cursor },
          select: { id: true, parentId: true },
        });
        if (!ancestor) throw new ValidationError("상위 라이선스를 찾을 수 없습니다.");
        if (ancestor.parentId === null) break; // 루트 도달 → 순환 없음
        if (ancestor.parentId === licenseId) {
          throw new ValidationError("순환 참조가 발생합니다. 하위 라이선스를 상위로 설정할 수 없습니다.");
        }
        cursor = ancestor.parentId;
      }
    }

    // 날짜 순서 검증 (둘 다 전달된 경우)
    if (purchaseDateVal && expiryDateVal && expiryDateVal < purchaseDateVal) {
      throw new ValidationError("만료일은 구매일 이후여야 합니다.");
    }

    // 비용 필드 검증
    const paymentCycle = body.paymentCycle !== undefined
      ? vEnum<PaymentCycle>(body.paymentCycle, VALID_PAYMENT_CYCLES) : undefined;
    const billingQty = body.quantity !== undefined
      ? vNum(body.quantity, { min: 1, integer: true }) : undefined;
    const unitPriceVal = body.unitPrice !== undefined
      ? vNum(body.unitPrice, { min: 0 }) : undefined;
    const currency = body.currency !== undefined
      ? vEnumReq<Currency>(body.currency, "currency", VALID_CURRENCIES) : undefined;
    const exchangeRate = body.exchangeRate !== undefined
      ? (vNum(body.exchangeRate, { min: 0.0001 }) ?? 1.0) : undefined;

    let totalAmountForeign: number | null | undefined = undefined;
    let totalAmountKRW: number | null | undefined = undefined;
    if (paymentCycle && billingQty != null && unitPriceVal != null) {
      const result = computeCost({
        paymentCycle,
        quantity: billingQty,
        unitPrice: unitPriceVal,
        currency: currency ?? "KRW",
        exchangeRate: exchangeRate != null && exchangeRate > 0 ? exchangeRate : 1,
        isVatIncluded: vBool(body.isVatIncluded),
      });
      totalAmountForeign = result.totalAmountForeign;
      totalAmountKRW = result.totalAmountKRW;
    } else if (billingQty === null || unitPriceVal === null) {
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
          ...(nameVal !== undefined && { name: nameVal }),
          ...(licenseType !== undefined && { licenseType }),
          ...(keyVal !== undefined && { key: newLicenseType === "VOLUME" ? (keyVal || null) : null }),
          ...(totalQuantity !== undefined && { totalQuantity }),
          ...(priceVal !== undefined && { price: priceVal }),
          ...(purchaseDateVal !== undefined && { purchaseDate: purchaseDateVal }),
          ...(expiryDateVal !== undefined && { expiryDate: expiryDateVal }),
          ...(noticeDays !== undefined && { noticePeriodDays: noticeDays }),
          ...(adminNameVal !== undefined && { adminName: adminNameVal }),
          ...(descriptionVal !== undefined && { description: descriptionVal }),
          ...(paymentCycle !== undefined && { paymentCycle }),
          ...(billingQty !== undefined && { quantity: billingQty }),
          ...(unitPriceVal !== undefined && { unitPrice: unitPriceVal }),
          ...(currency !== undefined && { currency }),
          ...(exchangeRate !== undefined && { exchangeRate }),
          ...(body.isVatIncluded !== undefined && { isVatIncluded: vBool(body.isVatIncluded) }),
          ...(totalAmountForeign !== undefined && { totalAmountForeign }),
          ...(totalAmountKRW !== undefined && { totalAmountKRW }),
          ...(parentIdVal !== undefined && { parentId: parentIdVal }),
        },
      });

      if (existing && licenseType !== undefined) {
        const wasKeyBased = existing.licenseType === "KEY_BASED";
        const isKeyBased = licenseType === "KEY_BASED";

        if (wasKeyBased && !isKeyBased) {
          await deleteAllSeats(tx, licenseId);
        } else if (!wasKeyBased && isKeyBased) {
          await syncSeats(tx, licenseId, totalQuantity ?? updated.totalQuantity);
        }
      }

      if (updated.licenseType === "KEY_BASED" && totalQuantity !== undefined && totalQuantity !== null) {
        await syncSeats(tx, licenseId, totalQuantity);
      }

      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: licenseId,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: updated.name },
      });

      return updated;
    });

    return NextResponse.json(license);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to update license:", error);
    return NextResponse.json(
      { error: "라이선스 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/licenses/:id — 라이선스 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const { id } = await params;
    const licenseId = Number(id);

    await prisma.$transaction(async (tx) => {
      const target = await tx.license.findUnique({ where: { id: licenseId }, select: { name: true } });
      await tx.assignmentHistory.deleteMany({ where: { licenseId } });
      await tx.assignment.deleteMany({ where: { licenseId } });
      await tx.licenseGroupMember.deleteMany({ where: { licenseId } });
      await tx.licenseSeat.deleteMany({ where: { licenseId } });
      await tx.licenseOwner.deleteMany({ where: { licenseId } });
      await tx.licenseRenewalHistory.deleteMany({ where: { licenseId } });
      await tx.notificationLog.deleteMany({ where: { licenseId } });
      await tx.license.delete({ where: { id: licenseId } });

      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: licenseId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: target?.name, deletedAt: new Date().toISOString() },
      });
    });

    return NextResponse.json({ message: "라이선스가 삭제되었습니다." });
  } catch (error) {
    const pErr2 = handlePrismaError(error);
    if (pErr2) return pErr2;
    console.error("Failed to delete license:", error);
    return NextResponse.json(
      { error: "라이선스 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
