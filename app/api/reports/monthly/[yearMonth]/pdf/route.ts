/**
 * GET /api/reports/monthly/{yearMonth}/pdf
 *
 * BE-032: PDF 보고서 다운로드
 * @react-pdf/renderer를 사용하여 월별 자산 비용 보고서를 PDF로 생성·다운로드한다.
 * 폐쇄망 환경에 맞게 외부 의존 없이 서버 사이드에서 PDF를 렌더링한다.
 *
 * 인증: 로그인 필수
 * 응답: application/pdf (attachment)
 */

/* eslint-disable jsx-a11y/alt-text */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ValidationError, handleValidationError } from "@/lib/validation";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

type Params = { params: Promise<{ yearMonth: string }> };

// ── 한글 라벨 ───────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "소프트웨어",
  CLOUD: "클라우드",
  HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인/SSL",
  OTHER: "기타",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "사용 중",
  INACTIVE: "미사용",
  DISPOSED: "폐기",
};

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function parsePeriod(yearMonth: string) {
  const match = yearMonth.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) throw new ValidationError("유효하지 않은 기간입니다. 형식: YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    year,
    month,
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0, 23, 59, 59, 999),
    period: yearMonth,
  };
}

function fmtCurrency(val: number): string {
  return Math.round(val).toLocaleString("ko-KR");
}

function fmtDate(val: Date | null): string {
  if (!val) return "-";
  return new Date(val).toISOString().split("T")[0];
}

// ── PDF 스타일 ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  // Cover
  coverPage: {
    padding: 40,
    fontFamily: "Helvetica",
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 8,
  },
  coverMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 24,
  },
  // Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
  },
  // Summary cards
  summaryRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  summaryLabel: {
    width: "40%",
    color: "#6B7280",
  },
  summaryValue: {
    width: "60%",
    fontWeight: "bold",
    color: "#111827",
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9CA3AF",
  },
});

// ── PDF 문서 컴포넌트 ───────────────────────────────────────────────────────
interface ReportData {
  period: string;
  startDate: Date;
  endDate: Date;
  assetCount: number;
  totalMonthlyCost: number;
  byType: Array<{ type: string; count: number; cost: number }>;
  byStatus: Array<{ status: string; count: number; cost: number }>;
  byDept: Array<{ dept: string; count: number; cost: number }>;
  assets: Array<{
    name: string;
    type: string;
    status: string;
    vendor: string;
    monthlyCost: string;
    assignee: string;
    expiryDate: string;
  }>;
}

function ReportDocument({ data }: { data: ReportData }) {
  return React.createElement(
    Document,
    { title: `Asset Report ${data.period}`, author: "License Manager" },

    // ── Cover Page ──
    React.createElement(
      Page,
      { size: "A4", style: s.coverPage },
      React.createElement(Text, { style: s.coverTitle }, "Monthly Asset Report"),
      React.createElement(Text, { style: s.coverSubtitle }, `${data.period}`),
      React.createElement(
        Text,
        { style: s.coverSubtitle },
        `Assets: ${data.assetCount} | Cost: ${fmtCurrency(data.totalMonthlyCost)} KRW`,
      ),
      React.createElement(
        Text,
        { style: s.coverMeta },
        `Generated: ${fmtDate(new Date())} | License Manager`,
      ),
    ),

    // ── Summary Page ──
    React.createElement(
      Page,
      { size: "A4", style: s.page },

      // Summary section
      React.createElement(Text, { style: s.sectionTitle }, "Summary"),
      React.createElement(
        View,
        { style: { marginBottom: 12 } },
        summaryItem("Period", data.period),
        summaryItem("Start Date", fmtDate(data.startDate)),
        summaryItem("End Date", fmtDate(data.endDate)),
        summaryItem("Total Assets", String(data.assetCount)),
        summaryItem("Monthly Cost (KRW)", fmtCurrency(data.totalMonthlyCost)),
        summaryItem("Report Generated", fmtDate(new Date())),
      ),

      // By Type
      React.createElement(Text, { style: s.sectionTitle }, "By Type"),
      tableView(
        ["Type", "Count", "Monthly Cost (KRW)"],
        [30, 20, 50],
        data.byType.map((t) => [
          TYPE_LABELS[t.type] ?? t.type,
          String(t.count),
          fmtCurrency(t.cost),
        ]),
      ),

      // By Status
      React.createElement(Text, { style: s.sectionTitle }, "By Status"),
      tableView(
        ["Status", "Count", "Monthly Cost (KRW)"],
        [30, 20, 50],
        data.byStatus.map((st) => [
          STATUS_LABELS[st.status] ?? st.status,
          String(st.count),
          fmtCurrency(st.cost),
        ]),
      ),

      // By Department
      React.createElement(Text, { style: s.sectionTitle }, "By Department"),
      tableView(
        ["Department", "Count", "Monthly Cost (KRW)"],
        [40, 15, 45],
        data.byDept.map((d) => [d.dept, String(d.count), fmtCurrency(d.cost)]),
      ),

      // Footer
      React.createElement(
        View,
        { style: s.footer, fixed: true },
        React.createElement(Text, null, "License Manager"),
        React.createElement(
          Text,
          { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` },
        ),
      ),
    ),

    // ── Detail Page(s) ──
    React.createElement(
      Page,
      { size: "A4", style: { ...s.page, padding: 30 }, orientation: "landscape" },
      React.createElement(Text, { style: s.sectionTitle }, "Asset Details"),
      tableView(
        ["Name", "Type", "Status", "Vendor", "Cost/mo", "Assignee", "Expiry"],
        [22, 12, 10, 16, 14, 12, 14],
        data.assets.map((a) => [
          a.name,
          a.type,
          a.status,
          a.vendor,
          a.monthlyCost,
          a.assignee,
          a.expiryDate,
        ]),
      ),
      React.createElement(
        View,
        { style: s.footer, fixed: true },
        React.createElement(Text, null, "License Manager"),
        React.createElement(
          Text,
          { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` },
        ),
      ),
    ),
  );
}

function summaryItem(label: string, value: string) {
  return React.createElement(
    View,
    { style: s.summaryRow },
    React.createElement(Text, { style: s.summaryLabel }, label),
    React.createElement(Text, { style: s.summaryValue }, value),
  );
}

function tableView(
  headers: string[],
  widths: number[],
  rows: string[][],
) {
  return React.createElement(
    View,
    null,
    // Header row
    React.createElement(
      View,
      { style: s.tableHeader },
      ...headers.map((h, i) =>
        React.createElement(
          Text,
          { key: `h-${i}`, style: { ...s.tableHeaderCell, width: `${widths[i]}%` } },
          h,
        ),
      ),
    ),
    // Data rows
    ...rows.map((row, ri) =>
      React.createElement(
        View,
        { key: `r-${ri}`, style: ri % 2 === 0 ? s.tableRow : s.tableRowAlt },
        ...row.map((cell, ci) =>
          React.createElement(
            Text,
            { key: `c-${ri}-${ci}`, style: { ...s.tableCell, width: `${widths[ci]}%` } },
            cell,
          ),
        ),
      ),
    ),
  );
}

// ── GET 핸들러 ──────────────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { yearMonth } = await params;
    const { startDate, endDate, period } = parsePeriod(yearMonth);

    // 데이터 조회
    const assets = await prisma.asset.findMany({
      where: {
        createdAt: { lte: endDate },
        OR: [
          { status: { not: "DISPOSED" } },
          { status: "DISPOSED", updatedAt: { gte: startDate } },
        ],
      },
      include: {
        assignee: { select: { name: true, department: true } },
        orgUnit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // 집계
    let totalMonthlyCost = 0;
    const typeMap = new Map<string, { count: number; cost: number }>();
    const statusMap = new Map<string, { count: number; cost: number }>();
    const deptMap = new Map<string, { count: number; cost: number }>();

    for (const asset of assets) {
      const mc = asset.monthlyCost ? Number(asset.monthlyCost) : 0;
      totalMonthlyCost += mc;

      const te = typeMap.get(asset.type) ?? { count: 0, cost: 0 };
      te.count++; te.cost += mc;
      typeMap.set(asset.type, te);

      const se = statusMap.get(asset.status) ?? { count: 0, cost: 0 };
      se.count++; se.cost += mc;
      statusMap.set(asset.status, se);

      const dept = asset.orgUnit?.name ?? asset.assignee?.department ?? "N/A";
      const de = deptMap.get(dept) ?? { count: 0, cost: 0 };
      de.count++; de.cost += mc;
      deptMap.set(dept, de);
    }

    const reportData: ReportData = {
      period,
      startDate,
      endDate,
      assetCount: assets.length,
      totalMonthlyCost,
      byType: [...typeMap.entries()].map(([type, d]) => ({ type, count: d.count, cost: d.cost })),
      byStatus: [...statusMap.entries()].map(([status, d]) => ({ status, count: d.count, cost: d.cost })),
      byDept: [...deptMap.entries()].map(([dept, d]) => ({ dept, count: d.count, cost: d.cost })),
      assets: assets.map((a) => ({
        name: a.name,
        type: TYPE_LABELS[a.type] ?? a.type,
        status: STATUS_LABELS[a.status] ?? a.status,
        vendor: a.vendor ?? "-",
        monthlyCost: a.monthlyCost ? fmtCurrency(Number(a.monthlyCost)) : "-",
        assignee: a.assignee?.name ?? "-",
        expiryDate: fmtDate(a.expiryDate),
      })),
    };

    // PDF 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = React.createElement(ReportDocument, { data: reportData }) as any;
    const pdfBuffer = await renderToBuffer(doc);

    const fileName = `Asset_Report_${period}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to generate PDF report:", error);
    return NextResponse.json(
      { error: "PDF 보고서 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
