"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  X,
  Plus,
} from "lucide-react";

// ── 타입 ─────────────────────────────────────────────────────────────────────
type RenewalStatus = "BEFORE_RENEWAL" | "IN_PROGRESS" | "NOT_RENEWING" | "RENEWED";

type RenewalHistoryItem = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  memo: string | null;
  createdAt: string;
  actorId: number | null;
};

type LicenseOwner = {
  id: number;
  userId: number | null;
  orgUnitId: number | null;
  user?: { id: number; username: string } | null;
  orgUnit?: { id: number; name: string } | null;
};

type OrgUnit = { id: number; name: string; companyId: number };
type User = { id: number; username: string };

const STATUS_LABELS: Record<RenewalStatus, string> = {
  BEFORE_RENEWAL: "갱신 전",
  IN_PROGRESS: "진행 중",
  NOT_RENEWING: "갱신 안함",
  RENEWED: "갱신 완료",
};

const STATUS_COLORS: Record<RenewalStatus, string> = {
  BEFORE_RENEWAL: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  NOT_RENEWING: "bg-red-100 text-red-700",
  RENEWED: "bg-green-100 text-green-700",
};

// ── 갱신 상태 변경 패널 ───────────────────────────────────────────────────────
function RenewalStatusPanel({
  licenseId,
  currentStatus,
  renewalDate,
  renewalDateManual,
}: {
  licenseId: number;
  currentStatus: RenewalStatus | null;
  renewalDate: string | null;
  renewalDateManual: string | null;
}) {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showDateForm, setShowDateForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RenewalStatus>(
    currentStatus ?? "BEFORE_RENEWAL"
  );
  const [memo, setMemo] = useState("");
  const [manualDate, setManualDate] = useState(
    renewalDateManual ? renewalDateManual.slice(0, 10) : ""
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStatusSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch(`/api/licenses/${licenseId}/renewal-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus, memo: memo || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "상태 변경 실패");
        return;
      }
      setMemo("");
      setShowStatusForm(false);
      router.refresh();
    });
  }

  function handleDateSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch(`/api/licenses/${licenseId}/renewal-date`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renewalDateManual: manualDate ? new Date(manualDate).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "갱신일 설정 실패");
        return;
      }
      setShowDateForm(false);
      router.refresh();
    });
  }

  const displayStatus = currentStatus ?? "BEFORE_RENEWAL";

  return (
    <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <RefreshCw className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">갱신 관리</h3>
      </div>

      <div className="space-y-3 p-4">
        {/* 현재 상태 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">갱신 상태</span>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[displayStatus]}`}
            >
              {STATUS_LABELS[displayStatus]}
            </span>
            <button
              onClick={() => { setShowStatusForm(!showStatusForm); setError(""); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              변경
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 상태 변경 폼 */}
        {showStatusForm && (
          <form
            onSubmit={handleStatusSubmit}
            className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                새 상태
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as RenewalStatus)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                메모 (선택)
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="변경 사유..."
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStatusForm(false)}
                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "..." : "저장"}
              </button>
            </div>
          </form>
        )}

        {/* 갱신일 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">갱신일</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-gray-700">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {renewalDate
                ? new Date(renewalDate).toLocaleDateString("ko-KR")
                : "—"}
              {renewalDateManual && (
                <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">
                  수동
                </span>
              )}
            </span>
            <button
              onClick={() => { setShowDateForm(!showDateForm); setError(""); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              설정
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 갱신일 설정 폼 */}
        {showDateForm && (
          <form
            onSubmit={handleDateSubmit}
            className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                수동 갱신일 (비워두면 자동 계산으로 복원)
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDateForm(false)}
                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "..." : "저장"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── 갱신 이력 타임라인 ────────────────────────────────────────────────────────
function RenewalHistoryPanel({ licenseId }: { licenseId: number }) {
  const [history, setHistory] = useState<RenewalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/licenses/${licenseId}/renewal-history`)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setError("이력 로드 실패"))
      .finally(() => setLoading(false));
  }, [licenseId]);

  if (loading) return null;
  if (error || history.length === 0) return null;

  const displayed = expanded ? history : history.slice(0, 3);

  return (
    <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Clock className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">갱신 이력</h3>
        <span className="ml-auto text-xs text-gray-400">{history.length}건</span>
      </div>
      <div className="divide-y divide-gray-50 px-4 py-2">
        {displayed.map((item) => (
          <div key={item.id} className="flex items-start gap-3 py-2.5">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-700">
                {item.fromStatus ? (
                  <>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[(item.fromStatus as RenewalStatus)] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[(item.fromStatus as RenewalStatus)] ?? item.fromStatus}
                    </span>
                    {" → "}
                  </>
                ) : null}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[(item.toStatus as RenewalStatus)] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[(item.toStatus as RenewalStatus)] ?? item.toStatus}
                </span>
              </p>
              {item.memo && (
                <p className="mt-0.5 text-xs text-gray-500">{item.memo}</p>
              )}
            </div>
            <time className="shrink-0 text-[10px] text-gray-400">
              {new Date(item.createdAt).toLocaleDateString("ko-KR")}
            </time>
          </div>
        ))}
      </div>
      {history.length > 3 && (
        <div className="border-t border-gray-100 px-4 py-2 text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:underline"
          >
            {expanded ? "접기" : `전체 보기 (${history.length}건)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 라이선스 담당자 패널 ──────────────────────────────────────────────────────
function LicenseOwnersPanel({
  licenseId,
  users,
  orgUnits,
}: {
  licenseId: number;
  users: User[];
  orgUnits: OrgUnit[];
}) {
  const [owners, setOwners] = useState<LicenseOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"user" | "orgUnit">("user");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string>("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function loadOwners() {
    fetch(`/api/licenses/${licenseId}/owners`)
      .then((r) => r.json())
      .then((data) => setOwners(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOwners(); }, [licenseId]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const body =
      addType === "user"
        ? { userId: Number(selectedUserId) }
        : { orgUnitId: Number(selectedOrgUnitId) };

    startTransition(async () => {
      const res = await fetch(`/api/licenses/${licenseId}/owners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "담당자 추가 실패");
        return;
      }
      setShowAdd(false);
      setSelectedUserId("");
      setSelectedOrgUnitId("");
      loadOwners();
      router.refresh();
    });
  }

  function handleDelete(ownerId: number) {
    startTransition(async () => {
      await fetch(`/api/licenses/${licenseId}/owners/${ownerId}`, {
        method: "DELETE",
      });
      loadOwners();
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Users className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">라이선스 담당자</h3>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(""); }}
          className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-3.5 w-3.5" />
          추가
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="border-b border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddType("user")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${addType === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              개인
            </button>
            <button
              type="button"
              onClick={() => setAddType("orgUnit")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${addType === "orgUnit" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              부서
            </button>
          </div>

          {addType === "user" ? (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">사용자 선택</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedOrgUnitId}
              onChange={(e) => setSelectedOrgUnitId(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">부서 선택</option>
              {orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "..." : "추가"}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-50 px-4 py-1">
        {loading ? (
          <p className="py-3 text-xs text-gray-400">로딩 중...</p>
        ) : owners.length === 0 ? (
          <p className="py-3 text-xs text-gray-400">담당자가 없습니다.</p>
        ) : (
          owners.map((owner) => (
            <div key={owner.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                {owner.userId ? (
                  <>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">개인</span>
                    <span className="text-xs text-gray-700">
                      {owner.user?.username ?? `user #${owner.userId}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">부서</span>
                    <span className="text-xs text-gray-700">
                      {owner.orgUnit?.name ?? `unit #${owner.orgUnitId}`}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => handleDelete(owner.id)}
                disabled={isPending}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 export ──────────────────────────────────────────────────────
export { RenewalStatusPanel, RenewalHistoryPanel, LicenseOwnersPanel };
