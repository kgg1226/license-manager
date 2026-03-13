// BE-056: POST /api/cron/exchange-rate-sync — 환율 일일 동기화
// 매일 09:00 실행 / CRON_SECRET 필요
// 환경변수 OPEN_EXCHANGE_RATES_APP_ID 가 있으면 openexchangerates.org 사용
// 없으면 exchangerate-api.com 무료 엔드포인트 시도

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cron-auth";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "JPY", "GBP", "CNY"];

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    // 이미 오늘 데이터가 있으면 스킵
    const existing = await prisma.exchangeRate.findFirst({
      where: { date: today, currency: "USD" },
    });
    if (existing) {
      return NextResponse.json({ ok: true, message: `${today} 환율 이미 동기화됨`, skipped: true });
    }

    let rates: Record<string, number> | null = null;

    // OpenExchangeRates API (유료)
    const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
    if (appId) {
      const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD&symbols=${SUPPORTED_CURRENCIES.join(",")},KRW`);
      if (res.ok) {
        const data = await res.json();
        const usdToKRW = data.rates?.KRW ?? 1350;
        rates = {};
        for (const currency of SUPPORTED_CURRENCIES) {
          if (data.rates?.[currency] && currency !== "KRW") {
            // USD 기준 → KRW 기준으로 변환
            rates[currency] = usdToKRW / data.rates[currency];
          }
        }
      }
    }

    // 폴백: exchangerate-api.com 무료 (KRW 기준)
    if (!rates) {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/KRW", { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.result === "success" && data.rates) {
            rates = {};
            for (const currency of SUPPORTED_CURRENCIES) {
              if (data.rates[currency]) {
                // KRW → currency 비율이므로 역수
                rates[currency] = 1 / data.rates[currency];
              }
            }
          }
        }
      } catch {
        // 외부 API 실패 — 저장 건너뜀
      }
    }

    if (!rates) {
      return NextResponse.json({
        ok: false,
        message: "외부 환율 API 연결 실패. OPEN_EXCHANGE_RATES_APP_ID 환경변수를 설정하거나 수동으로 환율을 입력하세요.",
      }, { status: 503 });
    }

    // DB 저장
    const upserts = SUPPORTED_CURRENCIES
      .filter((c) => rates![c] != null)
      .map((currency) =>
        prisma.exchangeRate.upsert({
          where: { date_currency: { date: today, currency } },
          create: { date: today, currency, rateToKRW: rates![currency], source: "api" },
          update: { rateToKRW: rates![currency], source: "api" },
        })
      );

    const results = await prisma.$transaction(upserts);

    return NextResponse.json({
      ok: true,
      date: today,
      updated: results.length,
      rates,
      message: `${today} 환율 ${results.length}개 동기화 완료`,
    });
  } catch (error) {
    console.error("Exchange rate sync failed:", error);
    return NextResponse.json({ error: "환율 동기화에 실패했습니다." }, { status: 500 });
  }
}
