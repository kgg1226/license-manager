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
} from "lucide-react";
import LicenseAssignments from "./license-assignments";

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
  const totalSeats = license.isVolumeLicense
    ? license.totalQuantity
    : license.seats.length || license.totalQuantity;
  const assignedCount = activeAssignments.length;
  const remainingCount = totalSeats - assignedCount;
  const missingKeyCount = license.isVolumeLicense
    ? 0
    : license.seats.filter((s) => s.key === null).length;

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

  // Deduplicate by removing audit entries that are too close in time to assignment entries
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
    isVolumeLicense: license.isVolumeLicense,
    volumeKey: license.isVolumeLicense ? license.key : null,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{license.name}</h1>
            {license.isVolumeLicense && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                Volume
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
          {!license.isVolumeLicense && (
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
              label="만료일"
              value={formatDate(license.expiryDate)}
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="계약일"
              value={formatDate(license.contractDate)}
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
                  ? `만료 ${license.noticePeriodDays}일 전`
                  : "—"
              }
            />
            {license.isVolumeLicense && license.key && (
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

        {/* Seat Table (Individual only) */}
        {!license.isVolumeLicense && license.seats.length > 0 && (
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
