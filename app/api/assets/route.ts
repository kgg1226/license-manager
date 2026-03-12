// BE-021: GET — 자산 목록 조회 (필터/검색/페이지네이션)
// BE-021: POST — 자산 등록

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  ValidationError,
  handleValidationError,
  handlePrismaError,
  vStrReq,
  vStr,
  vNum,
  vEnum,
  vDate,
} from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

const ASSET_TYPES = ["SOFTWARE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "CONTRACT", "OTHER"] as const;
const ASSET_STATUSES = ["IN_STOCK", "IN_USE", "INACTIVE", "UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"] as const;
const BILLING_CYCLES = ["MONTHLY", "ANNUAL", "ONE_TIME", "USAGE_BASED"] as const;
const SORT_FIELDS = ["name", "type", "status", "cost", "monthlyCost", "purchaseDate", "expiryDate", "createdAt"] as const;

/** PC(Laptop/Desktop) 여부에 따라 감가상각 자동 계산 */
function isPcDeviceType(deviceType: string | null | undefined): boolean {
  return deviceType === "Laptop" || deviceType === "Desktop";
}

// ── GET /api/assets — 자산 목록 조회 ──

export async function GET(request: NextRequest) {

  try {
    const url = request.nextUrl;
    const type = vEnum(url.searchParams.get("type"), ASSET_TYPES);
    const status = vEnum(url.searchParams.get("status"), ASSET_STATUSES);
    const search = vStr(url.searchParams.get("search"), 200);
    const companyId = vNum(url.searchParams.get("companyId"), { min: 1, integer: true });
    const orgUnitId = vNum(url.searchParams.get("orgUnitId"), { min: 1, integer: true });
    const assigneeId = vNum(url.searchParams.get("assigneeId"), { min: 1, integer: true });

    const page = vNum(url.searchParams.get("page"), { min: 1, integer: true }) ?? 1;
    const limit = vNum(url.searchParams.get("limit"), { min: 1, max: 100, integer: true }) ?? 20;
    const sortBy = vEnum(url.searchParams.get("sortBy"), SORT_FIELDS) ?? "createdAt";
    const sortOrder = vEnum(url.searchParams.get("sortOrder"), ["asc", "desc"] as const) ?? "desc";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (orgUnitId) where.orgUnitId = orgUnitId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true } },
          orgUnit: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          hardwareDetail: true,
          cloudDetail: true,
          contractDetail: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({
      assets,
      total,
      page,
      limit,
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { error: "자산 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── POST /api/assets — 자산 등록 ──

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();

    // ── 필수 필드 검증 ──
    const nameVal = vStrReq(body.name, "자산명", 255);
    const typeVal = vEnum(body.type, ASSET_TYPES);
    if (!typeVal) throw new ValidationError("자산 유형은 필수입니다. 허용값: " + ASSET_TYPES.join(", "));

    // ── 선택 필드 검증 ──
    const vendorVal = vStr(body.vendor, 255);
    const descriptionVal = vStr(body.description, 2000);
    const costVal = vNum(body.cost, { min: 0 });
    const currencyVal = vStr(body.currency, 10);
    const billingCycleVal = body.billingCycle ? vEnum(body.billingCycle, BILLING_CYCLES) : null;
    const purchaseDateVal = vDate(body.purchaseDate);
    const expiryDateVal = vDate(body.expiryDate);
    const renewalDateVal = vDate(body.renewalDate);
    const companyIdVal = vNum(body.companyId, { min: 1, integer: true });
    const orgUnitIdVal = vNum(body.orgUnitId, { min: 1, integer: true });
    const assigneeIdVal = vNum(body.assigneeId, { min: 1, integer: true });

    // PC(Laptop/Desktop) 감가상각 자동 계산
    let finalBillingCycle = billingCycleVal as string | null;
    let monthlyCostVal = vNum(body.monthlyCost, { min: 0 });

    const hdDeviceType = body.hardwareDetail?.deviceType;
    if (typeVal === "HARDWARE" && isPcDeviceType(hdDeviceType)) {
      // PC 자산: billingCycle = DEPRECIATION, monthlyCost 자동 계산
      finalBillingCycle = "DEPRECIATION";
      const usefulLife = vNum(body.hardwareDetail?.usefulLifeYears, { min: 1, max: 50, integer: true }) ?? 5;
      if (costVal != null) {
        monthlyCostVal = Math.floor(costVal / usefulLife / 12);
      } else {
        monthlyCostVal = null;
      }
    } else if (monthlyCostVal == null && costVal != null && billingCycleVal) {
      // 비PC 자산: 기존 로직
      switch (billingCycleVal) {
        case "MONTHLY":
          monthlyCostVal = costVal;
          break;
        case "ANNUAL":
          monthlyCostVal = Math.round((costVal / 12) * 100) / 100;
          break;
        case "ONE_TIME":
          monthlyCostVal = 0;
          break;
        case "USAGE_BASED":
          monthlyCostVal = costVal;
          break;
      }
    }

    const asset = await prisma.$transaction(async (tx) => {
      // FK 존재 검증
      if (companyIdVal) {
        const company = await tx.orgCompany.findUnique({ where: { id: companyIdVal }, select: { id: true } });
        if (!company) throw new ValidationError("존재하지 않는 회사입니다.");
      }
      if (orgUnitIdVal) {
        const unit = await tx.orgUnit.findUnique({ where: { id: orgUnitIdVal }, select: { id: true } });
        if (!unit) throw new ValidationError("존재하지 않는 조직입니다.");
      }
      if (assigneeIdVal) {
        const emp = await tx.employee.findUnique({ where: { id: assigneeIdVal }, select: { id: true } });
        if (!emp) throw new ValidationError("존재하지 않는 조직원입니다.");
      }

      // ── Asset 생성 ──
      const assetData: Prisma.AssetCreateInput = {
        name: nameVal,
        type: typeVal,
        vendor: vendorVal,
        description: descriptionVal,
        cost: costVal,
        monthlyCost: monthlyCostVal,
        currency: currencyVal ?? "KRW",
        billingCycle: finalBillingCycle,
        purchaseDate: purchaseDateVal,
        expiryDate: expiryDateVal,
        renewalDate: renewalDateVal,
        createdBy: user.id,
        ...(companyIdVal && { company: { connect: { id: companyIdVal } } }),
        ...(orgUnitIdVal && { orgUnit: { connect: { id: orgUnitIdVal } } }),
        ...(assigneeIdVal && { assignee: { connect: { id: assigneeIdVal } } }),
      };

      const created = await tx.asset.create({ data: assetData });

      // ── 유형별 상세 생성 ──
      if (typeVal === "HARDWARE" && body.hardwareDetail) {
        const hd = body.hardwareDetail;
        await tx.hardwareDetail.create({
          data: {
            assetId: created.id,
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
            warrantyEndDate: hd.warrantyEndDate ? new Date(hd.warrantyEndDate) : null,
            warrantyProvider: vStr(hd.warrantyProvider, 255),
            purchaseOrderNumber: vStr(hd.purchaseOrderNumber, 100),
            invoiceNumber: vStr(hd.invoiceNumber, 100),
            condition: vStr(hd.condition, 1),
            notes: vStr(hd.notes, 2000),
            // 네트워크/인프라
            secondaryIp: vStr(hd.secondaryIp, 50),
            subnetMask: vStr(hd.subnetMask, 50),
            gateway: vStr(hd.gateway, 50),
            vlanId: vStr(hd.vlanId, 20),
            dnsName: vStr(hd.dnsName, 255),
            portCount: vNum(hd.portCount, { min: 0, max: 10000, integer: true }),
            firmwareVersion: vStr(hd.firmwareVersion, 100),
          },
        });
      }

      if (typeVal === "CLOUD" && body.cloudDetail) {
        const cd = body.cloudDetail;
        await tx.cloudDetail.create({
          data: {
            assetId: created.id,
            platform: vStr(cd.platform, 100),
            accountId: vStr(cd.accountId, 255),
            region: vStr(cd.region, 100),
            seatCount: vNum(cd.seatCount, { min: 0, integer: true }),
          },
        });
      }

      if (typeVal === "CONTRACT" && body.contractDetail) {
        const ct = body.contractDetail;
        await tx.contractDetail.create({
          data: {
            assetId: created.id,
            contractNumber: vStr(ct.contractNumber, 255),
            counterparty: vStr(ct.counterparty, 255),
            contractType: vStr(ct.contractType, 100),
            autoRenew: ct.autoRenew === true,
          },
        });
      }

      // ── AuditLog ──
      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: nameVal, type: typeVal, cost: costVal },
      });

      // 전체 데이터 반환
      return tx.asset.findUnique({
        where: { id: created.id },
        include: {
          assignee: { select: { id: true, name: true } },
          orgUnit: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          hardwareDetail: true,
          cloudDetail: true,
          contractDetail: true,
        },
      });
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to create asset:", error);
    return NextResponse.json(
      { error: "자산 등록에 실패했습니다." },
      { status: 500 },
    );
  }
}
