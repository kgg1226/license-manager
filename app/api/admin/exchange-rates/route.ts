// BE-048: GET /api/admin/exchange-rates — 환율 조회
// BE-049: POST /api/admin/exchange-rates/sync — 수동 환율 등록

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "JPY", "GBP", "CNY"];

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const rates = await prisma.exchangeRate.findMany({
    where: { date },
    orderBy: { currency: "asc" },
  });

  // 없는 통화는 기본값(null) 포함
  const result = SUPPORTED_CURRENCIES.map((currency) => {
    const found = rates.find((r) => r.currency === currency);
    return found ?? { currency, date, rateToKRW: null, source: null };
  });

  return NextResponse.json({ date, rates: result });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();

  try {
    const body = await request.json();
    const { date, rates } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "유효하지 않은 날짜입니다. 형식: YYYY-MM-DD" }, { status: 400 });
    }

    if (!rates || typeof rates !== "object") {
      return NextResponse.json({ error: "rates 객체가 필요합니다. 예: { USD: 1350.5, EUR: 1480 }" }, { status: 400 });
    }

    const upserts = [];
    for (const currency of SUPPORTED_CURRENCIES) {
      if (rates[currency] != null) {
        const rateValue = Number(rates[currency]);
        if (isNaN(rateValue) || rateValue <= 0) continue;
        upserts.push(
          prisma.exchangeRate.upsert({
            where: { date_currency: { date, currency } },
            create: { date, currency, rateToKRW: rateValue, source: "manual" },
            update: { rateToKRW: rateValue, source: "manual" },
          })
        );
      }
    }

    if (upserts.length === 0) {
      return NextResponse.json({ error: "업데이트할 환율 데이터가 없습니다." }, { status: 400 });
    }

    const results = await prisma.$transaction(upserts);
    return NextResponse.json({ ok: true, updated: results.length, date });
  } catch (error) {
    console.error("Exchange rate update failed:", error);
    return NextResponse.json({ error: "환율 업데이트에 실패했습니다." }, { status: 500 });
  }
}
