"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Send,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
  ArrowLeft,
  Mail,
  MessageSquare,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──

interface DiagStep {
  step: string;
  status: "ok" | "fail" | "skip";
  message: string;
  durationMs?: number;
}

interface TestResult {
  ok: boolean;
  diagnostics: DiagStep[];
}

interface NotifLog {
  id: number;
  channel: string;
  recipient: string;
  status: string;
  errorMsg?: string | null;
  sentAt: string;
  entityType?: string | null;
  license?: { id: number; name: string } | null;
  asset?: { id: number; name: string; type: string } | null;
}

interface LogStats {
  total: number;
  ok: number;
  fail: number;
  byChannel: { EMAIL: number; SLACK: number };
}

// ── Component ──

export default function NotificationSettingsPage() {
  // Test state
  const [testChannel, setTestChannel] = useState<"EMAIL" | "SLACK" | "BOTH">("BOTH");
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Log state
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logFilter, setLogFilter] = useState<{ status: string; channel: string }>({ status: "", channel: "" });

  // ── Load logs ──
  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logFilter.status) params.set("status", logFilter.status);
      if (logFilter.channel) params.set("channel", logFilter.channel);
      params.set("limit", "100");
      const res = await fetch(`/api/notifications/history?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs ?? []);
      setStats(data.stats ?? null);
    } catch {
      toast.error("알림 이력을 불러올 수 없습니다");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // ── Test send ──
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: testChannel,
          ...(testEmail && { email: testEmail }),
        }),
      });
      const data: TestResult = await res.json();
      setTestResult(data);
      if (data.ok) {
        toast.success("테스트 발송 성공");
      } else {
        toast.error("일부 채널에서 실패했습니다. 아래 진단 결과를 확인하세요.");
      }
      // Refresh logs after test
      setTimeout(() => loadLogs(), 1000);
    } catch {
      toast.error("테스트 요청 실패");
    } finally {
      setIsTesting(false);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "ok" || s === "OK") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === "fail" || s === "FAIL") return <XCircle className="h-4 w-4 text-red-500" />;
    return <MinusCircle className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/settings/groups" className="rounded-md p-2 hover:bg-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-7 w-7 text-blue-600" />
              알림 설정
            </h1>
            <p className="mt-1 text-sm text-gray-500">이메일·Slack 연동 테스트 및 발송 이력 확인</p>
          </div>
        </div>

        {/* ── Test Section ── */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">연동 테스트</h2>
          <p className="mb-4 text-sm text-gray-600">
            알림 채널이 올바르게 설정되었는지 테스트 메시지를 발송합니다.
            환경변수가 누락된 경우 상세 진단 결과를 확인할 수 있습니다.
          </p>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Channel selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">테스트 채널</label>
              <div className="flex gap-2">
                {(["EMAIL", "SLACK", "BOTH"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setTestChannel(ch)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      testChannel === ch
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {ch === "EMAIL" && <Mail className="h-3.5 w-3.5" />}
                    {ch === "SLACK" && <MessageSquare className="h-3.5 w-3.5" />}
                    {ch === "BOTH" && <Bell className="h-3.5 w-3.5" />}
                    {{ EMAIL: "이메일", SLACK: "Slack", BOTH: "둘 다" }[ch]}
                  </button>
                ))}
              </div>
            </div>

            {/* Email target (optional) */}
            {(testChannel === "EMAIL" || testChannel === "BOTH") && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">수신 이메일 (선택)</label>
                <input
                  type="email"
                  placeholder="비워두면 SMTP_FROM으로 발송"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isTesting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isTesting ? "테스트 중..." : "테스트 발송"}
          </button>

          {/* Test Results */}
          {testResult && (
            <div className={`mt-4 rounded-md border p-4 ${testResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="mb-3 flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${testResult.ok ? "text-green-800" : "text-red-800"}`}>
                  {testResult.ok ? "모든 채널 연동 성공" : "일부 채널에서 실패"}
                </span>
              </div>
              <div className="space-y-2">
                {testResult.diagnostics.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 rounded bg-white/60 px-3 py-2">
                    {statusIcon(d.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{d.step}</p>
                      <p className="text-xs text-gray-600 break-all">{d.message}</p>
                    </div>
                    {d.durationMs != null && (
                      <span className="flex-shrink-0 text-xs text-gray-400">{d.durationMs}ms</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Troubleshooting hints */}
              {!testResult.ok && (
                <div className="mt-3 rounded bg-white/80 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">문제 해결 가이드:</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {testResult.diagnostics.some((d) => d.message.includes("SMTP")) && (
                      <>
                        <li>• SMTP 환경변수가 올바른지 확인하세요 (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)</li>
                        <li>• 폐쇄망 환경에서는 내부 메일 서버를 사용해야 합니다</li>
                        <li>• SMTP_SECURE=true 로 TLS를 활성화해야 할 수 있습니다</li>
                      </>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("SLACK_WEBHOOK_URL")) && (
                      <>
                        <li>• Slack 앱 설정에서 Incoming Webhook을 활성화하세요</li>
                        <li>• Webhook URL을 SLACK_WEBHOOK_URL 환경변수에 설정하세요</li>
                      </>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("Slack API error")) && (
                      <>
                        <li>• Webhook URL이 유효한지 확인하세요 (만료되었을 수 있음)</li>
                        <li>• Slack 앱이 해당 채널에 접근 권한이 있는지 확인하세요</li>
                      </>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("ECONNREFUSED") || d.message.includes("ETIMEDOUT")) && (
                      <li>• 네트워크 연결을 확인하세요. 방화벽이 SMTP 포트를 차단하고 있을 수 있습니다.</li>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("auth")) && (
                      <li>• SMTP 인증 정보 (SMTP_USER, SMTP_PASS)가 올바른지 확인하세요</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Notification Log Section ── */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">발송 이력</h2>
            <button
              onClick={loadLogs}
              disabled={isLoadingLogs}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">전체</p>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="rounded-md bg-green-50 p-3 text-center">
                <p className="text-xs text-green-600">성공</p>
                <p className="text-lg font-bold text-green-700">{stats.ok}</p>
              </div>
              <div className="rounded-md bg-red-50 p-3 text-center">
                <p className="text-xs text-red-600">실패</p>
                <p className="text-lg font-bold text-red-700">{stats.fail}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-3 text-center">
                <p className="text-xs text-blue-600">이메일 / Slack</p>
                <p className="text-lg font-bold text-blue-700">{stats.byChannel.EMAIL} / {stats.byChannel.SLACK}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={logFilter.status}
              onChange={(e) => setLogFilter((p) => ({ ...p, status: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">모든 상태</option>
              <option value="OK">성공</option>
              <option value="FAIL">실패</option>
            </select>
            <select
              value={logFilter.channel}
              onChange={(e) => setLogFilter((p) => ({ ...p, channel: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">모든 채널</option>
              <option value="EMAIL">이메일</option>
              <option value="SLACK">Slack</option>
            </select>
          </div>

          {/* Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">시각</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">채널</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">수신자</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">대상</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">상태</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">오류</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLogs ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">로딩 중...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">발송 이력이 없습니다</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(log.sentAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.channel === "EMAIL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {log.channel === "EMAIL" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                          {log.channel === "EMAIL" ? "이메일" : "Slack"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate" title={log.recipient}>{log.recipient}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {log.license && (
                          <Link href={`/licenses/${log.license.id}`} className="text-blue-600 hover:underline">{log.license.name}</Link>
                        )}
                        {log.asset && (
                          <Link href={`/cloud/${log.asset.id}`} className="text-blue-600 hover:underline">{log.asset.name}</Link>
                        )}
                        {!log.license && !log.asset && "—"}
                      </td>
                      <td className="px-3 py-2">
                        {log.status === "OK" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />성공</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" />실패</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600 max-w-[200px] truncate" title={log.errorMsg ?? ""}>
                        {log.errorMsg || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
