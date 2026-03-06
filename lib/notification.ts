/**
 * 알림 헬퍼 (Slack Webhook + SMTP Email)
 *
 * 환경변수:
 *   SLACK_WEBHOOK_URL  — Incoming Webhook URL (없으면 Slack 발송 건너뜀)
 *   SMTP_HOST          — SMTP 서버 호스트
 *   SMTP_PORT          — SMTP 포트 (기본: 587)
 *   SMTP_USER          — SMTP 인증 사용자
 *   SMTP_PASS          — SMTP 인증 비밀번호
 *   SMTP_FROM          — 발신 이메일 주소
 *   SMTP_SECURE        — "true" 이면 TLS 사용 (기본: false)
 */

import nodemailer from "nodemailer";

export type NotifyResult = { ok: true } | { ok: false; error: string };

// ── Slack ────────────────────────────────────────────────────────────────────

export async function sendSlackMessage(text: string): Promise<NotifyResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, error: "SLACK_WEBHOOK_URL not configured" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Slack API error ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Email ────────────────────────────────────────────────────────────────────

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<NotifyResult> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return { ok: false, error: "SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM 필요)" };
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      ...(options.html && { html: options.html }),
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
