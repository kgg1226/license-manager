/**
 * POST /api/reports/monthly/send-email
 *
 * BE-034: 월별 자산 보고서 이메일 발송
 * 지정된 수신자에게 월별 보고서 요약 HTML 이메일과 Excel 첨부파일을 발송한다.
 *
 * 인증: ADMIN 세션 또는 CRON_SECRET Bearer 토큰
 * 요청:
 *   {
 *     "yearMonth": "2026-03",
 *     "recipients": ["admin@example.com", "manager@example.com"]
 *   }
 * 응답: { success: true, period, recipientCount, result }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ValidationError, handleValidationError } from "@/lib/validation";
import nodemailer from "nodemailer";
import ExcelJS from "exceljs";

// ── 유형·상태 한글 라벨 ─────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "소프트웨어",
  CLOUD: "클라우드",
  HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인·SSL",
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

function formatCurrency(val: number): string {
  return val.toLocaleString("ko-KR");
}

function formatDate(val: Date | null): string {
  if (!val) return "-";
  return new Date(val).toISOString().split("T")[0];
}

// ── CRON 인증 (공통 유틸리티) ────────────────────────────────────────────────
import { isCronAuthorized } from "@/lib/cron-auth";

// ── Excel 첨부파일 생성 (BE-031 로직 재사용) ────────────────────────────────
async function generateExcelBuffer(
  assets: Array<{
    name: string;
    type: string;
    status: string;
    vendor: string | null;
    monthlyCost: unknown;
    currency: string | null;
    expiryDate: Date | null;
    purchaseDate: Date | null;
    assignee: { name: string } | null;
    orgUnit: { name: string } | null;
  }>,
  period: string,
  startDate: Date,
  endDate: Date,
) {
  // 집계
  let totalMonthlyCost = 0;
  const typeMap = new Map<string, { count: number; cost: number }>();
  const statusMap = new Map<string, { count: number; cost: number }>();

  for (const asset of assets) {
    const mc = asset.monthlyCost ? Number(asset.monthlyCost) : 0;
    totalMonthlyCost += mc;

    const te = typeMap.get(asset.type) ?? { count: 0, cost: 0 };
    te.count++;
    te.cost += mc;
    typeMap.set(asset.type, te);

    const se = statusMap.get(asset.status) ?? { count: 0, cost: 0 };
    se.count++;
    se.cost += mc;
    statusMap.set(asset.status, se);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "License Manager";
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin" }, bottom: { style: "thin" },
    left: { style: "thin" }, right: { style: "thin" },
  };

  function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
    const row = ws.getRow(1);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = borderStyle;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
    row.height = 28;
  }

  // Sheet 1: 요약
  const wsSummary = wb.addWorksheet("요약");
  wsSummary.columns = [
    { header: "항목", key: "label", width: 25 },
    { header: "값", key: "value", width: 30 },
  ];
  styleHeader(wsSummary, 2);
  wsSummary.addRow({ label: "보고서 기간", value: period });
  wsSummary.addRow({ label: "시작일", value: formatDate(startDate) });
  wsSummary.addRow({ label: "종료일", value: formatDate(endDate) });
  wsSummary.addRow({ label: "총 자산 수", value: assets.length });
  wsSummary.addRow({ label: "월 비용 합계 (KRW)", value: formatCurrency(Math.round(totalMonthlyCost)) });
  wsSummary.addRow({ label: "보고서 생성일", value: formatDate(new Date()) });

  // Sheet 2: 유형별
  const wsType = wb.addWorksheet("유형별");
  wsType.columns = [
    { header: "유형", key: "type", width: 20 },
    { header: "자산 수", key: "count", width: 12 },
    { header: "월 비용 (KRW)", key: "cost", width: 20 },
  ];
  styleHeader(wsType, 3);
  for (const [type, data] of typeMap) {
    wsType.addRow({ type: TYPE_LABELS[type] ?? type, count: data.count, cost: formatCurrency(Math.round(data.cost)) });
  }

  // Sheet 3: 상태별
  const wsStatus = wb.addWorksheet("상태별");
  wsStatus.columns = [
    { header: "상태", key: "status", width: 15 },
    { header: "자산 수", key: "count", width: 12 },
    { header: "월 비용 (KRW)", key: "cost", width: 20 },
  ];
  styleHeader(wsStatus, 3);
  for (const [status, data] of statusMap) {
    wsStatus.addRow({ status: STATUS_LABELS[status] ?? status, count: data.count, cost: formatCurrency(Math.round(data.cost)) });
  }

  // Sheet 4: 상세 목록
  const wsDetail = wb.addWorksheet("상세 목록");
  wsDetail.columns = [
    { header: "자산명", key: "name", width: 30 },
    { header: "유형", key: "type", width: 15 },
    { header: "상태", key: "status", width: 12 },
    { header: "공급업체", key: "vendor", width: 20 },
    { header: "월 비용", key: "monthlyCost", width: 15 },
    { header: "통화", key: "currency", width: 8 },
    { header: "담당자", key: "assignee", width: 15 },
    { header: "만료일", key: "expiryDate", width: 14 },
  ];
  styleHeader(wsDetail, 8);
  for (const a of assets) {
    wsDetail.addRow({
      name: a.name,
      type: TYPE_LABELS[a.type] ?? a.type,
      status: STATUS_LABELS[a.status] ?? a.status,
      vendor: a.vendor ?? "-",
      monthlyCost: a.monthlyCost ? formatCurrency(Number(a.monthlyCost)) : "-",
      currency: a.currency ?? "KRW",
      assignee: a.assignee?.name ?? "-",
      expiryDate: formatDate(a.expiryDate),
    });
  }

  return wb.xlsx.writeBuffer();
}

// ── 이메일 HTML 템플릿 ──────────────────────────────────────────────────────
function buildEmailHtml(
  period: string,
  assetCount: number,
  totalCost: number,
  byType: Array<{ type: string; count: number; cost: number }>,
): string {
  const typeRows = byType
    .map(
      (t) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${TYPE_LABELS[t.type] ?? t.type}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${t.count}건</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(Math.round(t.cost))} KRW</td>
        </tr>`,
    )
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#2563EB;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">📊 월별 자산 비용 리포트</h2>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px">기간: ${period}</p>
  </div>

  <div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none">
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr>
        <td style="padding:8px 0;font-weight:bold;width:50%">총 자산 수</td>
        <td style="padding:8px 0;text-align:right;font-size:18px;color:#2563EB;font-weight:bold">${assetCount}건</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:bold">월 비용 합계</td>
        <td style="padding:8px 0;text-align:right;font-size:18px;color:#2563EB;font-weight:bold">${formatCurrency(Math.round(totalCost))} KRW</td>
      </tr>
    </table>

    <h3 style="font-size:14px;margin:16px 0 8px;color:#374151">유형별 현황</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#e5e7eb">
          <th style="padding:6px 12px;text-align:left">유형</th>
          <th style="padding:6px 12px;text-align:right">수량</th>
          <th style="padding:6px 12px;text-align:right">월 비용</th>
        </tr>
      </thead>
      <tbody>
        ${typeRows}
      </tbody>
    </table>
  </div>

  <div style="padding:16px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
    <p style="margin:0;font-size:13px;color:#6b7280">
      자세한 내용은 첨부된 Excel 파일을 참고하세요.<br>
      이 이메일은 License Manager 시스템에서 자동 발송되었습니다.
    </p>
  </div>
</body>
</html>`;
}

// ── POST 핸들러 ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 인증: ADMIN 세션 또는 CRON_SECRET
  const cronAuth = isCronAuthorized(request);
  if (!cronAuth) {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { yearMonth, recipients } = body;

    // 입력 검증
    if (!yearMonth || typeof yearMonth !== "string") {
      throw new ValidationError("yearMonth 필드는 필수입니다.");
    }
    const { startDate, endDate, period } = parsePeriod(yearMonth);

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new ValidationError("recipients 배열은 1명 이상이어야 합니다.");
    }
    if (recipients.length > 50) {
      throw new ValidationError("수신자는 최대 50명까지 지정할 수 있습니다.");
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of recipients) {
      if (typeof email !== "string" || !emailRegex.test(email.trim())) {
        throw new ValidationError(`유효하지 않은 이메일입니다: ${email}`);
      }
    }
    const validEmails = recipients.map((e: string) => e.trim());

    // SMTP 설정 확인
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      return NextResponse.json(
        { error: "SMTP가 설정되지 않았습니다. 환경변수를 확인하세요." },
        { status: 503 },
      );
    }

    // ── 데이터 조회 ──
    const assets = await prisma.asset.findMany({
      where: {
        createdAt: { lte: endDate },
        OR: [
          { status: { not: "DISPOSED" } },
          { status: "DISPOSED", updatedAt: { gte: startDate } },
        ],
      },
      include: {
        assignee: { select: { name: true } },
        orgUnit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // ── 집계 ──
    let totalMonthlyCost = 0;
    const typeMap = new Map<string, { count: number; cost: number }>();
    for (const asset of assets) {
      const mc = asset.monthlyCost ? Number(asset.monthlyCost) : 0;
      totalMonthlyCost += mc;
      const entry = typeMap.get(asset.type) ?? { count: 0, cost: 0 };
      entry.count++;
      entry.cost += mc;
      typeMap.set(asset.type, entry);
    }
    const byType = [...typeMap.entries()].map(([type, data]) => ({
      type,
      count: data.count,
      cost: data.cost,
    }));

    // ── Excel 첨부파일 생성 ──
    const excelBuffer = await generateExcelBuffer(assets, period, startDate, endDate);
    const fileName = `Asset_Report_${period}.xlsx`;

    // ── 이메일 HTML 생성 ──
    const html = buildEmailHtml(period, assets.length, totalMonthlyCost, byType);
    const textContent =
      `[월별 자산 비용 리포트 - ${period}]\n` +
      `총 자산 수: ${assets.length}건\n` +
      `월 비용 합계: ${formatCurrency(Math.round(totalMonthlyCost))} KRW\n\n` +
      `자세한 내용은 첨부된 Excel 파일을 참고하세요.`;

    // ── SMTP 발송 ──
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === "true";

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: validEmails.join(", "),
      subject: `[자산 보고서] ${period} 월별 자산 비용 리포트`,
      text: textContent,
      html,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(excelBuffer as ArrayBuffer),
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      period,
      recipientCount: validEmails.length,
      recipients: validEmails,
      assetCount: assets.length,
      totalMonthlyCost: Math.round(totalMonthlyCost),
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to send report email:", error);
    return NextResponse.json(
      { error: "보고서 이메일 발송에 실패했습니다.", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
