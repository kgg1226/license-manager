// BE-022: GET — 자산 상세 조회
// BE-022: PUT — 자산 수정
// BE-022: DELETE — 자산 삭제 (DISPOSED 상태만 삭제 가능)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  ValidationError,
  handleValidationError,
  handlePrismaError,
  vStr,
  vNum,
  vEnum,
  vDate,
} from "@/lib/validation";

const ASSET_TYPES = ["SOFTWARE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "CONTRACT", "OTHER"] as const;
const BILLING_CYCLES = ["MONTHLY", "ANNUAL", "ONE_TIME", "USAGE_BASED"] as const;

function isPcDeviceType(deviceType: string | null | undefined): boolean {
  return deviceType === "Laptop" || deviceType === "Desktop";
}

type Params = { params: Promise<{ id: string }> };

// ── GET /api/assets/[id] — 자산 상세 조회 ──

export async function GET(_request: NextRequest, { params }: Params) {

  try {
    const { id } = await params;
    const assetId = Number(id);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        assignee: { select: { id: true, name: true, department: true, email: true } },
        orgUnit: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        subCategory: { include: { majorCategory: { select: { id: true, name: true, code: true } } } },
        hardwareDetail: true,
        cloudDetail: true,
        contractDetail: true,
        licenseLinks: {
          include: { license: { select: { id: true, name: true, licenseType: true, expiryDate: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });
    }

    // 최근 AuditLog 10건
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "ASSET", entityId: assetId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ ...asset, auditLogs });
  } catch (error) {
    console.error("Failed to fetch asset:", error);
    return NextResponse.json(
      { error: "자산 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── PUT /api/assets/[id] — 자산 수정 ──

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    const body = await request.json();

    // ── 부분 수정 허용 — 전달된 필드만 업데이트 ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    if (body.name !== undefined) data.name = vStr(body.name, 255) ?? undefined;
    if (body.vendor !== undefined) data.vendor = vStr(body.vendor, 255);
    if (body.description !== undefined) data.description = vStr(body.description, 2000);
    if (body.cost !== undefined) data.cost = vNum(body.cost, { min: 0 });
    if (body.monthlyCost !== undefined) data.monthlyCost = vNum(body.monthlyCost, { min: 0 });
    if (body.currency !== undefined) data.currency = vStr(body.currency, 10);
    if (body.billingCycle !== undefined) data.billingCycle = body.billingCycle ? vEnum(body.billingCycle, BILLING_CYCLES) : null;
    if (body.purchaseDate !== undefined) data.purchaseDate = vDate(body.purchaseDate);
    if (body.expiryDate !== undefined) data.expiryDate = vDate(body.expiryDate);
    if (body.renewalDate !== undefined) data.renewalDate = vDate(body.renewalDate);
    if (body.companyId !== undefined) data.companyId = vNum(body.companyId, { min: 1, integer: true });
    if (body.orgUnitId !== undefined) data.orgUnitId = vNum(body.orgUnitId, { min: 1, integer: true });
    if (body.assigneeId !== undefined) data.assigneeId = vNum(body.assigneeId, { min: 1, integer: true });
    if (body.subCategoryId !== undefined) data.subCategoryId = vNum(body.subCategoryId, { min: 1, integer: true });

    // PC(Laptop/Desktop) 감가상각 자동 계산 또는 기존 방식
    if (body.monthlyCost === undefined) {
      const existing = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { type: true, cost: true, billingCycle: true, hardwareDetail: { select: { deviceType: true, usefulLifeYears: true } } },
      });
      if (existing) {
        const assetType = existing.type;
        const hdDeviceType = body.hardwareDetail?.deviceType ?? existing.hardwareDetail?.deviceType;
        const finalCost = data.cost !== undefined ? data.cost : existing.cost ? Number(existing.cost) : null;

        if (assetType === "HARDWARE" && isPcDeviceType(hdDeviceType)) {
          // PC 자산: 감가상각 자동 계산
          const usefulLife = body.hardwareDetail?.usefulLifeYears
            ? (vNum(body.hardwareDetail.usefulLifeYears, { min: 1, max: 50, integer: true }) ?? 5)
            : (existing.hardwareDetail?.usefulLifeYears ?? 5);
          data.billingCycle = "DEPRECIATION";
          if (finalCost != null) {
            data.monthlyCost = Math.floor(finalCost / usefulLife / 12);
          } else {
            data.monthlyCost = null;
          }
        } else if (body.cost !== undefined || body.billingCycle !== undefined) {
          // 비PC 자산: 기존 로직
          const finalCycle = data.billingCycle !== undefined ? data.billingCycle : existing.billingCycle;
          if (finalCost != null && finalCycle) {
            switch (finalCycle) {
              case "MONTHLY": data.monthlyCost = finalCost; break;
              case "ANNUAL": data.monthlyCost = Math.round((finalCost / 12) * 100) / 100; break;
              case "ONE_TIME": data.monthlyCost = 0; break;
              case "USAGE_BASED": data.monthlyCost = finalCost; break;
            }
          }
        }
      }
    }

    const asset = await prisma.$transaction(async (tx) => {
      // FK 존재 검증
      if (data.companyId) {
        const company = await tx.orgCompany.findUnique({ where: { id: data.companyId }, select: { id: true } });
        if (!company) throw new ValidationError("존재하지 않는 회사입니다.");
      }
      if (data.orgUnitId) {
        const unit = await tx.orgUnit.findUnique({ where: { id: data.orgUnitId }, select: { id: true } });
        if (!unit) throw new ValidationError("존재하지 않는 조직입니다.");
      }
      if (data.assigneeId) {
        const emp = await tx.employee.findUnique({ where: { id: data.assigneeId }, select: { id: true } });
        if (!emp) throw new ValidationError("존재하지 않는 조직원입니다.");
      }
      if (data.subCategoryId) {
        const sub = await tx.assetSubCategory.findUnique({ where: { id: data.subCategoryId }, select: { id: true } });
        if (!sub) throw new ValidationError("존재하지 않는 자산 소분류입니다.");
      }

      const updated = await tx.asset.update({
        where: { id: assetId },
        data,
        include: {
          assignee: { select: { id: true, name: true } },
          orgUnit: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          subCategory: { include: { majorCategory: { select: { id: true, name: true, code: true } } } },
          hardwareDetail: true,
          cloudDetail: true,
          contractDetail: true,
        },
      });

      // 유형별 상세 upsert
      if (body.hardwareDetail !== undefined) {
        if (body.hardwareDetail) {
          const hd = body.hardwareDetail;
          const hdFields = {
            assetTag: vStr(hd.assetTag, 100),
            deviceType: vStr(hd.deviceType, 50),
            manufacturer: vStr(hd.manufacturer, 255),
            model: vStr(hd.model, 255),
            serialNumber: vStr(hd.serialNumber, 255),
            hostname: vStr(hd.hostname, 255),
            macAddress: vStr(hd.macAddress, 50),
            ipAddress: vStr(hd.ipAddress, 50),
            os: vStr(hd.os, 50),
            osVersion: vStr(hd.osVersion, 100),
            location: vStr(hd.location, 500),
            cpu: vStr(hd.cpu, 255),
            ram: vStr(hd.ram, 255),
            storage: vStr(hd.storage, 255),
            gpu: vStr(hd.gpu, 255),
            displaySize: vStr(hd.displaySize, 100),
            usefulLifeYears: vNum(hd.usefulLifeYears, { min: 1, max: 50, integer: true }) ?? 5,
            // 보증/구매 관리
            warrantyEndDate: hd.warrantyEndDate !== undefined ? (hd.warrantyEndDate ? new Date(hd.warrantyEndDate) : null) : undefined,
            warrantyProvider: hd.warrantyProvider !== undefined ? vStr(hd.warrantyProvider, 255) : undefined,
            purchaseOrderNumber: hd.purchaseOrderNumber !== undefined ? vStr(hd.purchaseOrderNumber, 100) : undefined,
            invoiceNumber: hd.invoiceNumber !== undefined ? vStr(hd.invoiceNumber, 100) : undefined,
            condition: hd.condition !== undefined ? vStr(hd.condition, 1) : undefined,
            notes: hd.notes !== undefined ? vStr(hd.notes, 2000) : undefined,
            // 네트워크/인프라
            secondaryIp: hd.secondaryIp !== undefined ? vStr(hd.secondaryIp, 50) : undefined,
            subnetMask: hd.subnetMask !== undefined ? vStr(hd.subnetMask, 50) : undefined,
            gateway: hd.gateway !== undefined ? vStr(hd.gateway, 50) : undefined,
            vlanId: hd.vlanId !== undefined ? vStr(hd.vlanId, 20) : undefined,
            dnsName: hd.dnsName !== undefined ? vStr(hd.dnsName, 255) : undefined,
            portCount: hd.portCount !== undefined ? vNum(hd.portCount, { min: 0, max: 10000, integer: true }) : undefined,
            firmwareVersion: hd.firmwareVersion !== undefined ? vStr(hd.firmwareVersion, 100) : undefined,
          };
          await tx.hardwareDetail.upsert({
            where: { assetId },
            create: { assetId, ...hdFields },
            update: hdFields,
          });
        } else {
          await tx.hardwareDetail.deleteMany({ where: { assetId } });
        }
      }

      if (body.cloudDetail !== undefined) {
        if (body.cloudDetail) {
          const cd = body.cloudDetail;
          const cdFields = {
            platform: vStr(cd.platform, 100),
            accountId: vStr(cd.accountId, 255),
            region: vStr(cd.region, 100),
            seatCount: vNum(cd.seatCount, { min: 0, integer: true }),
            serviceCategory: vStr(cd.serviceCategory, 50),
            resourceType: vStr(cd.resourceType, 100),
            resourceId: vStr(cd.resourceId, 500),
            instanceSpec: vStr(cd.instanceSpec, 100),
            storageSize: vStr(cd.storageSize, 100),
            endpoint: vStr(cd.endpoint, 500),
            vpcId: vStr(cd.vpcId, 50),
            availabilityZone: vStr(cd.availabilityZone, 50),
            // 계약/구독 관리
            contractStartDate: cd.contractStartDate !== undefined ? (cd.contractStartDate ? new Date(cd.contractStartDate) : null) : undefined,
            contractTermMonths: cd.contractTermMonths !== undefined ? vNum(cd.contractTermMonths, { min: 1, max: 120, integer: true }) : undefined,
            renewalDate: cd.renewalDate !== undefined ? (cd.renewalDate ? new Date(cd.renewalDate) : null) : undefined,
            cancellationNoticeDate: cd.cancellationNoticeDate !== undefined ? (cd.cancellationNoticeDate ? new Date(cd.cancellationNoticeDate) : null) : undefined,
            cancellationNoticeDays: cd.cancellationNoticeDays !== undefined ? vNum(cd.cancellationNoticeDays, { min: 1, max: 365, integer: true }) : undefined,
            paymentMethod: cd.paymentMethod !== undefined ? vStr(cd.paymentMethod, 50) : undefined,
            contractNumber: cd.contractNumber !== undefined ? vStr(cd.contractNumber, 255) : undefined,
            adminEmail: vStr(cd.adminEmail, 255),
            adminSlackId: cd.adminSlackId !== undefined ? vStr(cd.adminSlackId, 50) : undefined,
            notifyChannels: cd.notifyChannels !== undefined ? vStr(cd.notifyChannels, 10) : undefined,
            autoRenew: cd.autoRenew != null ? Boolean(cd.autoRenew) : null,
            notes: vStr(cd.notes, 2000),
          };
          await tx.cloudDetail.upsert({
            where: { assetId },
            create: { assetId, ...cdFields },
            update: cdFields,
          });
        } else {
          await tx.cloudDetail.deleteMany({ where: { assetId } });
        }
      }

      if (body.contractDetail !== undefined) {
        if (body.contractDetail) {
          const ct = body.contractDetail;
          const ctFields = {
            contractNumber: vStr(ct.contractNumber, 255),
            counterparty: vStr(ct.counterparty, 255),
            contractType: vStr(ct.contractType, 100),
            autoRenew: ct.autoRenew === true,
          };
          await tx.contractDetail.upsert({
            where: { assetId },
            create: { assetId, ...ctFields },
            update: ctFields,
          });
        } else {
          await tx.contractDetail.deleteMany({ where: { assetId } });
        }
      }

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: data,
      });

      return updated;
    });

    return NextResponse.json(asset);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, {
      notFoundMessage: "자산을 찾을 수 없습니다.",
    });
    if (pErr) return pErr;
    console.error("Failed to update asset:", error);
    return NextResponse.json(
      { error: "자산 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── DELETE /api/assets/[id] — 자산 삭제 ──

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const assetId = Number(id);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, name: true, status: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });
    }

    // 사용 중이거나 재고 상태 자산은 삭제 불가 — DISPOSED로 먼저 변경 필요
    if (asset.status === "IN_USE" || asset.status === "IN_STOCK") {
      return NextResponse.json(
        { error: "사용 중이거나 재고 상태 자산은 삭제할 수 없습니다. 먼저 폐기(DISPOSED) 처리해주세요." },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.delete({ where: { id: assetId } });

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: asset.name },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to delete asset:", error);
    return NextResponse.json(
      { error: "자산 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
