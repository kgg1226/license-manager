// BE-070: GET /api/export/all — 전체 자산 Excel/CSV Export
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "소프트웨어", CLOUD: "클라우드", HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인·SSL", CONTRACT: "계약", OTHER: "기타",
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "재고", IN_USE: "사용 중", INACTIVE: "미사용",
  UNUSABLE: "불용", PENDING_DISPOSAL: "폐기 대상", DISPOSED: "폐기 완료",
};

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function fmtNum(v: number | { toNumber(): number } | null): number | string {
  if (v == null) return "";
  return typeof v === "number" ? v : v.toNumber();
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const format = request.nextUrl.searchParams.get("format") ?? "xlsx";

    const [licenses, assets, employees] = await Promise.all([
      prisma.license.findMany({
        include: { assignments: { where: { returnedDate: null } } },
        orderBy: { name: "asc" },
      }),
      prisma.asset.findMany({
        include: {
          assignee: { select: { name: true } },
          orgUnit: { select: { name: true } },
          company: { select: { name: true } },
          contractDetail: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        include: {
          orgUnit: { select: { name: true } },
          company: { select: { name: true } },
          assignments: { where: { returnedDate: null }, select: { id: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    if (format === "csv") {
      return buildCsvResponse(licenses, assets, employees);
    }

    return buildExcelResponse(licenses, assets, employees);
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "내보내기에 실패했습니다." }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildExcelResponse(licenses: any[], assets: any[], employees: any[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Asset Manager";
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

  function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
    const row = ws.getRow(1);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
    row.height = 28;
  }

  // Sheet 1: 라이선스
  const wsLic = wb.addWorksheet("라이선스");
  wsLic.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "라이선스명", key: "name", width: 30 },
    { header: "유형", key: "type", width: 12 },
    { header: "총 수량", key: "qty", width: 10 },
    { header: "배정 수", key: "assigned", width: 10 },
    { header: "잔여 수", key: "remaining", width: 10 },
    { header: "통화", key: "currency", width: 8 },
    { header: "총액(KRW)", key: "amountKRW", width: 15 },
    { header: "구매일", key: "purchaseDate", width: 14 },
    { header: "만료일", key: "expiryDate", width: 14 },
    { header: "담당자", key: "admin", width: 15 },
  ];
  for (const l of licenses) {
    wsLic.addRow({
      id: l.id, name: l.name, type: l.licenseType,
      qty: l.totalQuantity, assigned: l.assignments.length,
      remaining: l.totalQuantity - l.assignments.length,
      currency: l.currency, amountKRW: l.totalAmountKRW ?? "",
      purchaseDate: fmtDate(l.purchaseDate), expiryDate: fmtDate(l.expiryDate),
      admin: l.adminName ?? "",
    });
  }
  styleHeader(wsLic, 11);

  // Sheet 2: 자산
  const wsAsset = wb.addWorksheet("자산");
  wsAsset.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "자산명", key: "name", width: 30 },
    { header: "유형", key: "type", width: 14 },
    { header: "상태", key: "status", width: 12 },
    { header: "공급업체", key: "vendor", width: 20 },
    { header: "비용", key: "cost", width: 15 },
    { header: "월비용", key: "monthlyCost", width: 15 },
    { header: "통화", key: "currency", width: 8 },
    { header: "구매일", key: "purchaseDate", width: 14 },
    { header: "만료일", key: "expiryDate", width: 14 },
    { header: "담당자", key: "assignee", width: 15 },
    { header: "부서", key: "orgUnit", width: 15 },
    { header: "회사", key: "company", width: 15 },
  ];
  for (const a of assets) {
    wsAsset.addRow({
      id: a.id, name: a.name,
      type: TYPE_LABELS[a.type] ?? a.type,
      status: STATUS_LABELS[a.status] ?? a.status,
      vendor: a.vendor ?? "",
      cost: fmtNum(a.cost), monthlyCost: fmtNum(a.monthlyCost),
      currency: a.currency,
      purchaseDate: fmtDate(a.purchaseDate), expiryDate: fmtDate(a.expiryDate),
      assignee: a.assignee?.name ?? "", orgUnit: a.orgUnit?.name ?? "",
      company: a.company?.name ?? "",
    });
  }
  styleHeader(wsAsset, 13);

  // Sheet 3: 조직원
  const wsEmp = wb.addWorksheet("조직원");
  wsEmp.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "이름", key: "name", width: 15 },
    { header: "이메일", key: "email", width: 25 },
    { header: "직함", key: "title", width: 15 },
    { header: "부서", key: "department", width: 15 },
    { header: "조직", key: "orgUnit", width: 15 },
    { header: "회사", key: "company", width: 15 },
    { header: "상태", key: "status", width: 10 },
    { header: "배정 수", key: "assignCount", width: 10 },
  ];
  for (const e of employees) {
    wsEmp.addRow({
      id: e.id, name: e.name, email: e.email ?? "",
      title: e.title ?? "", department: e.department ?? "",
      orgUnit: e.orgUnit?.name ?? "", company: e.company?.name ?? "",
      status: e.status === "ACTIVE" ? "재직" : "퇴사 중",
      assignCount: e.assignments.length,
    });
  }
  styleHeader(wsEmp, 9);

  // Sheet 4: 비용 요약
  const wsSummary = wb.addWorksheet("비용 요약");
  wsSummary.columns = [
    { header: "항목", key: "label", width: 25 },
    { header: "값", key: "value", width: 30 },
  ];
  const totalLicCost = licenses.reduce((s, l) => s + (l.totalAmountKRW ?? 0), 0);
  const totalAssetMonthlyCost = assets.reduce((s, a) => {
    const mc = a.monthlyCost ? (typeof a.monthlyCost === "number" ? a.monthlyCost : a.monthlyCost.toNumber()) : 0;
    return s + mc;
  }, 0);
  wsSummary.addRow({ label: "총 라이선스 수", value: licenses.length });
  wsSummary.addRow({ label: "총 자산 수", value: assets.length });
  wsSummary.addRow({ label: "총 조직원 수", value: employees.length });
  wsSummary.addRow({ label: "라이선스 총액 (KRW)", value: totalLicCost.toLocaleString("ko-KR") });
  wsSummary.addRow({ label: "자산 월비용 합계 (KRW)", value: Math.round(totalAssetMonthlyCost).toLocaleString("ko-KR") });
  wsSummary.addRow({ label: "자산 연비용 합계 (KRW)", value: Math.round(totalAssetMonthlyCost * 12).toLocaleString("ko-KR") });
  wsSummary.addRow({ label: "Export 일시", value: new Date().toLocaleString("ko-KR") });
  styleHeader(wsSummary, 2);

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="asset-export-${today}.xlsx"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCsvResponse(licenses: any[], assets: any[], employees: any[]) {
  const lines: string[] = [];

  lines.push("=== 라이선스 ===");
  lines.push("ID,라이선스명,유형,총 수량,배정 수,통화,총액(KRW),구매일,만료일");
  for (const l of licenses) {
    lines.push([
      l.id, `"${l.name}"`, l.licenseType, l.totalQuantity, l.assignments.length,
      l.currency, l.totalAmountKRW ?? "", fmtDate(l.purchaseDate), fmtDate(l.expiryDate),
    ].join(","));
  }

  lines.push("");
  lines.push("=== 자산 ===");
  lines.push("ID,자산명,유형,상태,공급업체,비용,월비용,통화,구매일,만료일");
  for (const a of assets) {
    lines.push([
      a.id, `"${a.name}"`, a.type, a.status, `"${a.vendor ?? ""}"`,
      fmtNum(a.cost), fmtNum(a.monthlyCost), a.currency,
      fmtDate(a.purchaseDate), fmtDate(a.expiryDate),
    ].join(","));
  }

  lines.push("");
  lines.push("=== 조직원 ===");
  lines.push("ID,이름,이메일,부서,상태,배정 수");
  for (const e of employees) {
    lines.push([
      e.id, `"${e.name}"`, `"${e.email ?? ""}"`, `"${e.department ?? ""}"`,
      e.status, e.assignments.length,
    ].join(","));
  }

  const csv = "\uFEFF" + lines.join("\n");
  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="asset-export-${today}.csv"`,
    },
  });
}
