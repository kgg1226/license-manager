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

const ASSET_TYPES = ["SOFTWARE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "OTHER"] as const;
const BILLING_CYCLES = ["MONTHLY", "ANNUAL", "ONE_TIME"] as const;

type Params = { params: Promise<{ id: string }> };

// ── GET /api/assets/[id] — 자산 상세 조회 ──

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const assetId = Number(id);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        assignee: { select: { id: true, name: true, department: true, email: true } },
        orgUnit: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        hardwareDetail: true,
        cloudDetail: true,
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

    // monthlyCost 자동 계산 (cost나 billingCycle이 변경되었으면)
    if (body.monthlyCost === undefined && (body.cost !== undefined || body.billingCycle !== undefined)) {
      const existing = await prisma.asset.findUnique({ where: { id: assetId }, select: { cost: true, billingCycle: true } });
      if (existing) {
        const finalCost = data.cost !== undefined ? data.cost : existing.cost ? Number(existing.cost) : null;
        const finalCycle = data.billingCycle !== undefined ? data.billingCycle : existing.billingCycle;
        if (finalCost != null && finalCycle) {
          switch (finalCycle) {
            case "MONTHLY": data.monthlyCost = finalCost; break;
            case "ANNUAL": data.monthlyCost = Math.round((finalCost / 12) * 100) / 100; break;
            case "ONE_TIME": data.monthlyCost = 0; break;
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

      const updated = await tx.asset.update({
        where: { id: assetId },
        data,
        include: {
          assignee: { select: { id: true, name: true } },
          orgUnit: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          hardwareDetail: true,
          cloudDetail: true,
        },
      });

      // 유형별 상세 upsert
      if (body.hardwareDetail !== undefined) {
        if (body.hardwareDetail) {
          const hd = body.hardwareDetail;
          await tx.hardwareDetail.upsert({
            where: { assetId },
            create: {
              assetId,
              manufacturer: vStr(hd.manufacturer, 255),
              model: vStr(hd.model, 255),
              serialNumber: vStr(hd.serialNumber, 255),
              location: vStr(hd.location, 500),
              specs: hd.specs ?? null,
            },
            update: {
              manufacturer: vStr(hd.manufacturer, 255),
              model: vStr(hd.model, 255),
              serialNumber: vStr(hd.serialNumber, 255),
              location: vStr(hd.location, 500),
              specs: hd.specs ?? null,
            },
          });
        } else {
          await tx.hardwareDetail.deleteMany({ where: { assetId } });
        }
      }

      if (body.cloudDetail !== undefined) {
        if (body.cloudDetail) {
          const cd = body.cloudDetail;
          await tx.cloudDetail.upsert({
            where: { assetId },
            create: {
              assetId,
              platform: vStr(cd.platform, 100),
              accountId: vStr(cd.accountId, 255),
              region: vStr(cd.region, 100),
              seatCount: vNum(cd.seatCount, { min: 0, integer: true }),
            },
            update: {
              platform: vStr(cd.platform, 100),
              accountId: vStr(cd.accountId, 255),
              region: vStr(cd.region, 100),
              seatCount: vNum(cd.seatCount, { min: 0, integer: true }),
            },
          });
        } else {
          await tx.cloudDetail.deleteMany({ where: { assetId } });
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

    // ACTIVE 상태 자산은 삭제 불가 — DISPOSED로 먼저 변경 필요
    if (asset.status === "ACTIVE") {
      return NextResponse.json(
        { error: "사용 중인 자산은 삭제할 수 없습니다. 먼저 폐기(DISPOSED) 처리해주세요." },
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
