import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  Users,
  CheckCircle,
  AlertTriangle,
  Calendar,
  CreditCard,
  UserCircle,
  FileText,
  Clock,
  Calculator,
} from "lucide-react";
import LicenseAssignments from "./license-assignments";
import { computeCost, CURRENCY_SYMBOLS, PAYMENT_CYCLE_LABELS } from "@/lib/cost-calculator";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("ko-KR");
}

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return price.toLocaleString("ko-KR") + "원";
}

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const licenseId = Number(id);

  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: {
      seats: {
        include: {
          assignments: {
            where: { returnedDate: null },
            select: {
              id: true,
              employee: { select: { id: true, name: true, department: true } },
              assignedDate: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
      assignments: {
        where: { returnedDate: null },
        include: {
          employee: { select: { id: true, name: true, department: true } },
          seat: { select: { key: true } },
        },
        orderBy: { assignedDate: "desc" },
      },
    },
  });

  if (!license) notFound();

  // Fetch history from both AssignmentHistory and AuditLog
  const [assignmentHistory, auditLogs] = await Promise.all([
    prisma.assignmentHistory.findMany({
      where: { licenseId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        reason: true,
        createdAt: true,
        employeeId: true,
        assignment: {
          select: {
            employee: { select: { name: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "LICENSE", entityId: licenseId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        actor: true,
        details: true,
        createdAt: true,
      },
    }),
  ]);

  // Dashboard stats
  const activeAssignments = license.assignments;
  const isKeyBased = license.licenseType === "KEY_BASED";
  const totalSeats = isKeyBased
    ? license.seats.length || license.totalQuantity
    : license.totalQuantity;
  const assignedCount = activeAssignments.length;
  const remainingCount = totalSeats - assignedCount;
  const missingKeyCount = isKeyBased
    ? license.seats.filter((s) => s.key === null).length
    : 0;

  // Merge history entries
  type HistoryEntry = {
    id: string;
    action: string;
    description: string;
    createdAt: Date;
    source: "assignment" | "audit";
  };

  const history: HistoryEntry[] = [
    ...assignmentHistory.map((h) => ({
      id: `ah-${h.id}`,
      action: h.action,
      description: (() => {
        const empName = h.assignment?.employee?.name ?? `직원 #${h.employeeId}`;
        const actionLabel =
          h.action === "ASSIGNED"
            ? "배정"
            : h.action === "RETURNED"
              ? "반납"
              : "해제";
        return `${empName} — ${actionLabel}${h.reason ? ` (${h.reason})` : ""}`;
      })(),
      createdAt: h.createdAt,
      source: "assignment" as const,
    })),
    ...auditLogs.map((a) => ({
      id: `al-${a.id}`,
      action: a.action,
      description: (() => {
        if (a.details) {
          try {
            const d = JSON.parse(a.details);
            if (d.summary) return d.summary as string;
          } catch {}
        }
        const label =
          a.action === "CREATED"
            ? "생성"
            : a.action === "UPDATED"
              ? "수정"
              : a.action === "DELETED"
                ? "삭제"
                : a.action === "IMPORTED"
                  ? "가져오기"
                  : a.action;
        return `${label}${a.actor ? ` — ${a.actor}` : ""}`;
      })(),
      createdAt: a.createdAt,
      source: "audit" as const,
    })),
  ];

  history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const displayHistory = history.slice(0, 30);

  const actionBadge: Record<string, string> = {
    ASSIGNED: "text-green-700 bg-green-50",
    RETURNED: "text-yellow-700 bg-yellow-50",
    REVOKED: "text-red-700 bg-red-50",
    UNASSIGNED: "text-red-700 bg-red-50",
    CREATED: "text-purple-700 bg-purple-50",
    UPDATED: "text-blue-700 bg-blue-50",
    DELETED: "text-red-700 bg-red-50",
    IMPORTED: "text-indigo-700 bg-indigo-50",
  };

  const actionLabel: Record<string, string> = {
    ASSIGNED: "배정",
    RETURNED: "반납",
    REVOKED: "해제",
    UNASSIGNED: "해제",
    CREATED: "생성",
    UPDATED: "수정",
    DELETED: "삭제",
    IMPORTED: "가져오기",
  };

  // Prepare assignment data for client component
  const assignmentData = activeAssignments.map((a) => ({
    assignmentId: a.id,
    employeeId: a.employee.id,
    employeeName: a.employee.name,
    department: a.employee.department,
    assignedDate: a.assignedDate.toLocaleDateString("ko-KR"),
    seatKey: a.seat?.key ?? null,
    licenseType: license.licenseType as "NO_KEY" | "KEY_BASED" | "VOLUME",
    volumeKey: license.licenseType === "VOLUME" ? license.key : null,
  }));

  const typeLabel =
    license.licenseType === "VOLUME"
      ? "Volume"
      : license.licenseType === "NO_KEY"
        ? "No Key"
        : null;

  // Compute cost breakdown for display
  const hasCostData =
    license.quantity != null &&
    license.unitPrice != null &&
    license.paymentCycle != null;

  const costBreakdown = hasCostData
    ? computeCost({
        paymentCycle: license.paymentCycle!,
        quantity: license.quantity!,
        unitPrice: license.unitPrice!,
        currency: license.currency,
        exchangeRate: license.exchangeRate,
        isVatIncluded: license.isVatIncluded,
      })
    : null;

  const currencySymbol = CURRENCY_SYMBOLS[license.currency];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{license.name}</h1>
            {typeLabel && (
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                license.licenseType === "VOLUME"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {typeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/licenses/${licenseId}/edit`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              수정
            </Link>
            <Link
              href="/licenses"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; 목록으로
            </Link>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DashboardCard
            icon={<KeyRound className="h-5 w-5 text-blue-600" />}
            label="전체 시트"
            value={totalSeats}
          />
          <DashboardCard
            icon={<Users className="h-5 w-5 text-green-600" />}
            label="배정"
            value={assignedCount}
          />
          <DashboardCard
            icon={<CheckCircle className="h-5 w-5 text-gray-500" />}
            label="잔여"
            value={remainingCount}
          />
          {isKeyBased && (
            <DashboardCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
              label="키 미등록"
              value={missingKeyCount}
              warning={missingKeyCount > 0}
            />
          )}
        </div>

        {/* Basic Info */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">기본 정보</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="구매일"
              value={formatDate(license.purchaseDate)}
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="갱신일"
              value={formatDate(license.expiryDate)}
            />
            <InfoItem
              icon={<CreditCard className="h-4 w-4" />}
              label="금액"
              value={formatPrice(license.price)}
            />
            <InfoItem
              icon={<UserCircle className="h-4 w-4" />}
              label="담당자"
              value={license.adminName ?? "—"}
            />
            <InfoItem
              icon={<Clock className="h-4 w-4" />}
              label="해지 통보"
              value={
                license.noticePeriodDays
                  ? `갱신 ${license.noticePeriodDays}일 전`
                  : "—"
              }
            />
            {license.licenseType === "VOLUME" && license.key && (
              <div className="sm:col-span-3">
                <InfoItem
                  icon={<KeyRound className="h-4 w-4" />}
                  label="볼륨 키"
                  value={license.key}
                  mono
                />
              </div>
            )}
            {license.description && (
              <div className="sm:col-span-3">
                <InfoItem
                  icon={<FileText className="h-4 w-4" />}
                  label="설명"
                  value={license.description}
                />
              </div>
            )}
          </dl>
        </div>

        {/* Cost Breakdown */}
        {costBreakdown && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Calculator className="h-5 w-5 text-blue-500" />
              비용 정보
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label="납부 주기"
                value={PAYMENT_CYCLE_LABELS[license.paymentCycle!]}
              />
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label={`단가 (${currencySymbol})`}
                value={`${currencySymbol}${license.unitPrice!.toLocaleString("ko-KR")}`}
              />
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label="결제 수량"
                value={`${license.quantity!.toLocaleString("ko-KR")}개`}
              />
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label={`합계 (${currencySymbol})`}
                value={`${currencySymbol}${costBreakdown.totalAmountForeign.toLocaleString("ko-KR")} (VAT 포함)`}
              />
              {license.currency !== "KRW" && (
                <InfoItem
                  icon={<CreditCard className="h-4 w-4" />}
                  label="환율"
                  value={`1 ${license.currency} = ₩${license.exchangeRate.toLocaleString("ko-KR")}`}
                />
              )}
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-md bg-blue-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">월 환산 (₩)</p>
                <p className="mt-1 text-xl font-bold text-blue-700">
                  ₩{costBreakdown.monthlyKRW.toLocaleString("ko-KR")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">연 환산 (₩)</p>
                <p className="mt-1 text-xl font-bold text-blue-700">
                  ₩{costBreakdown.annualKRW.toLocaleString("ko-KR")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seat Table (KEY_BASED only) */}
        {isKeyBased && license.seats.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              시트 현황 ({license.seats.length}개)
            </h2>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      키
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      배정자
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {license.seats.map((seat, idx) => {
                    const activeAssignment = seat.assignments[0];
                    return (
                      <tr key={seat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm tabular-nums text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {seat.key ? (
                            <span className="font-mono text-gray-900">
                              {seat.key}
                            </span>
                          ) : (
                            <span className="italic text-gray-400">미등록</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {activeAssignment ? (
                            <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              사용 중
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              미배정
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {activeAssignment ? (
                            <Link
                              href={`/employees/${activeAssignment.employee.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {activeAssignment.employee.name} (
                              {activeAssignment.employee.department})
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Assignments */}
        <LicenseAssignments
          licenseId={licenseId}
          assignments={assignmentData}
        />

        {/* History Timeline */}
        {displayHistory.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">이력</h2>
              <Link
                href={`/history?entityType=LICENSE&entityId=${licenseId}`}
                className="text-sm text-blue-600 hover:underline"
              >
                전체 보기 &rarr;
              </Link>
            </div>
            <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <div className="divide-y divide-gray-100">
                {displayHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${actionBadge[entry.action] ?? "text-gray-700 bg-gray-50"}`}
                    >
                      {actionLabel[entry.action] ?? entry.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900">
                        {entry.description}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">
                      {entry.createdAt.toLocaleDateString("ko-KR")}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardCard({
  icon,
  label,
  value,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-lg bg-white p-4 shadow-sm ring-1 ${warning ? "ring-amber-300" : "ring-gray-200"}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase text-gray-500">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-bold ${warning ? "text-amber-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase text-gray-500">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-gray-900 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
