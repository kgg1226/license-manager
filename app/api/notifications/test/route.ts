/**
 * POST /api/notifications/test
 * 알림 연동 테스트 — 이메일 / Slack 발송 테스트 + 진단 로그 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail, sendSlackMessage } from "@/lib/notification";

interface DiagStep {
  step: string;
  status: "ok" | "fail" | "skip";
  message: string;
  durationMs?: number;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { channel, email, slackMessage } = body as {
    channel?: "EMAIL" | "SLACK" | "BOTH";
    email?: string;
    slackMessage?: string;
  };

  if (!channel) {
    return NextResponse.json({ error: "channel 필수 (EMAIL | SLACK | BOTH)" }, { status: 400 });
  }

  const diagnostics: DiagStep[] = [];
  let overallOk = true;

  // ── Email Test ──
  if (channel === "EMAIL" || channel === "BOTH") {
    // Step 1: Check env vars
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    const missingVars: string[] = [];
    if (!SMTP_HOST) missingVars.push("SMTP_HOST");
    if (!SMTP_USER) missingVars.push("SMTP_USER");
    if (!SMTP_PASS) missingVars.push("SMTP_PASS");
    if (!SMTP_FROM) missingVars.push("SMTP_FROM");

    if (missingVars.length > 0) {
      diagnostics.push({
        step: "이메일 환경변수 확인",
        status: "fail",
        message: `누락된 환경변수: ${missingVars.join(", ")}. .env 파일 또는 docker-compose.yml에서 설정하세요.`,
      });
      overallOk = false;
    } else {
      diagnostics.push({
        step: "이메일 환경변수 확인",
        status: "ok",
        message: `SMTP_HOST=${SMTP_HOST}, SMTP_PORT=${process.env.SMTP_PORT ?? "587"}, SMTP_FROM=${SMTP_FROM}`,
      });

      // Step 2: Actually send
      const targetEmail = email || SMTP_FROM;
      const start = Date.now();
      const result = await sendEmail({
        to: targetEmail!,
        subject: "[Asset Manager] 이메일 알림 테스트",
        text: `이 메일은 Asset Manager 알림 시스템 테스트 메일입니다.\n\n발송 시각: ${new Date().toLocaleString("ko-KR")}\n테스트 실행자: ${user.username}`,
      });
      const elapsed = Date.now() - start;

      if (result.ok) {
        diagnostics.push({
          step: "이메일 발송 테스트",
          status: "ok",
          message: `${targetEmail}로 테스트 메일 발송 성공`,
          durationMs: elapsed,
        });
      } else {
        diagnostics.push({
          step: "이메일 발송 테스트",
          status: "fail",
          message: result.error,
          durationMs: elapsed,
        });
        overallOk = false;
      }
    }
  } else {
    diagnostics.push({ step: "이메일 테스트", status: "skip", message: "이메일 채널 미선택" });
  }

  // ── Slack Test ──
  if (channel === "SLACK" || channel === "BOTH") {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      diagnostics.push({
        step: "Slack Webhook URL 확인",
        status: "fail",
        message: "SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다. .env 파일에 추가하세요.",
      });
      overallOk = false;
    } else {
      diagnostics.push({
        step: "Slack Webhook URL 확인",
        status: "ok",
        message: `Webhook URL 설정됨 (${webhookUrl.substring(0, 40)}...)`,
      });

      const msg = slackMessage || `[Asset Manager 테스트] 알림 연동 테스트입니다. (${new Date().toLocaleString("ko-KR")}, 실행: ${user.username})`;
      const start = Date.now();
      const result = await sendSlackMessage(msg);
      const elapsed = Date.now() - start;

      if (result.ok) {
        diagnostics.push({
          step: "Slack 메시지 발송 테스트",
          status: "ok",
          message: "Slack 메시지 발송 성공",
          durationMs: elapsed,
        });
      } else {
        diagnostics.push({
          step: "Slack 메시지 발송 테스트",
          status: "fail",
          message: result.error,
          durationMs: elapsed,
        });
        overallOk = false;
      }
    }
  } else {
    diagnostics.push({ step: "Slack 테스트", status: "skip", message: "Slack 채널 미선택" });
  }

  return NextResponse.json({ ok: overallOk, diagnostics });
}
