// BE-030: GET /api/reports/monthly/{yearMonth}/data — 월별 자산 비용 보고서 데이터

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ValidationError, handleValidationError } from "@/lib/validation";

type Params = { params: Promise<{ yearMonth: string }> };

/** yearMonth 파라미터를 파싱하여 기간 범위를 반환 */
function parsePeriod(yearMonth: string) {
  const match = yearMonth.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) throw new ValidationError("유효하지 않은 기간입니다. 형식: YYYY-MM (예: 2026-03)");

  const year = Number(match[1]);
  const month = Number(match[2]);

  const startDate = new Date(year, month - 1, 1); // 월의 첫 날
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 월의 마지막 날

  return { year, month, startDate, endDate, period: yearMonth };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { yearMonth } = await params;
    const { startDate, endDate, period } = parsePeriod(yearMonth);

    // 해당 기간에 활성 상태인 자산 조회 (DISPOSED가 아닌 자산)
    // 기준: createdAt <= endDate AND (status != DISPOSED OR updatedAt >= startDate)
    const assets = await prisma.asset.findMany({
      where: {
        createdAt: { lte: endDate },
        OR: [
          { status: { not: "DISPOSED" } },
          { status: "DISPOSED", updatedAt: { gte: startDate } },
        ],
      },
      include: {
        assignee: { select: { id: true, name: true, department: true } },
        orgUnit: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        hardwareDetail: true,
        cloudDetail: true,
      },
      orderBy: { name: "asc" },
    });

    // ── 요약 집계 ──
    let totalMonthlyCost = 0;
    for (const asset of assets) {
      if (asset.monthlyCost) totalMonthlyCost += Number(asset.monthlyCost);
    }

    const summary = {
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      totalCost: Math.round(totalMonthlyCost * 100) / 100,
      currency: "KRW",
      assetCount: assets.length,
    };

    // ── 유형별 집계 ──
    const typeMap = new Map<string, { count: number; cost: number }>();
    for (const asset of assets) {
      const entry = typeMap.get(asset.type) ?? { count: 0, cost: 0 };
      entry.count++;
      if (asset.monthlyCost) entry.cost += Number(asset.monthlyCost);
      typeMap.set(asset.type, entry);
    }
    const byType = [...typeMap.entries()].map(([type, data]) => ({
      type,
      count: data.count,
      cost: Math.round(data.cost * 100) / 100,
    }));

    // ── 상태별 집계 ──
    const statusMap = new Map<string, { count: number; cost: number }>();
    for (const asset of assets) {
      const entry = statusMap.get(asset.status) ?? { count: 0, cost: 0 };
      entry.count++;
      if (asset.monthlyCost) entry.cost += Number(asset.monthlyCost);
      statusMap.set(asset.status, entry);
    }
    const byStatus = [...statusMap.entries()].map(([status, data]) => ({
      status,
      count: data.count,
      cost: Math.round(data.cost * 100) / 100,
    }));

    // ── 부서별 집계 ──
    const deptMap = new Map<string, { count: number; cost: number }>();
    for (const asset of assets) {
      const deptName = asset.orgUnit?.name ?? asset.assignee?.department ?? "미배정";
      const entry = deptMap.get(deptName) ?? { count: 0, cost: 0 };
      entry.count++;
      if (asset.monthlyCost) entry.cost += Number(asset.monthlyCost);
      deptMap.set(deptName, entry);
    }
    const byDepartment = [...deptMap.entries()].map(([department, data]) => ({
      department,
      count: data.count,
      cost: Math.round(data.cost * 100) / 100,
    }));

    // ── 만료 임박 자산 (30일 이내) ──
    const expiringWithin30 = assets.filter((a) => {
      if (!a.expiryDate || a.status === "DISPOSED") return false;
      const daysLeft = Math.ceil(
        (new Date(a.expiryDate).getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft >= 0 && daysLeft <= 30;
    });

    // ── 상세 목록 ──
    const assetDetails = assets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      vendor: a.vendor,
      monthlyCost: a.monthlyCost ? Number(a.monthlyCost) : null,
      cost: a.cost ? Number(a.cost) : null,
      currency: a.currency,
      billingCycle: a.billingCycle,
      purchaseDate: a.purchaseDate,
      expiryDate: a.expiryDate,
      assignee: a.assignee ? { id: a.assignee.id, name: a.assignee.name } : null,
      department: a.orgUnit?.name ?? a.assignee?.department ?? null,
      company: a.company ? { id: a.company.id, name: a.company.name } : null,
    }));

    return NextResponse.json({
      period,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      summary,
      byType,
      byStatus,
      byDepartment,
      expiringCount: expiringWithin30.length,
      assetDetails,
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to generate report data:", error);
    return NextResponse.json(
      { error: "보고서 데이터 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
