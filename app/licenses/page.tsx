import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteButton from "./delete-button";
import AssignButton from "./assign-button";
import UnassignButton from "./unassign-button";
import LicenseRow from "./license-row";

export const dynamic = "force-dynamic";

type SortField = "name" | "totalQuantity" | "assigned" | "expiryDate";
type SortOrder = "asc" | "desc";

const SORTABLE_COLUMNS: { key: SortField; label: string }[] = [
  { key: "name", label: "라이선스명" },
  { key: "totalQuantity", label: "수량" },
  { key: "assigned", label: "배정 현황" },
  { key: "expiryDate", label: "만료일" },
];

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return price.toLocaleString("ko-KR") + "원";
}

function getNoticeBadge(
  expiryDate: Date | null,
  noticePeriodDays: number | null
): { label: string; variant: "red" | "yellow" | "green" } | null {
  if (!expiryDate || !noticePeriodDays) return null;

  const noticeDate = new Date(expiryDate);
  noticeDate.setDate(noticeDate.getDate() - noticePeriodDays);

  const now = new Date();
  const diffMs = noticeDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "기한 초과", variant: "red" };
  if (diffDays <= 7) return { label: `D-${diffDays}`, variant: "red" };
  if (diffDays <= 30) return { label: `D-${diffDays}`, variant: "yellow" };
  return { label: `D-${diffDays}`, variant: "green" };
}

const badgeColors = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
};

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const params = await searchParams;
  const sortField = (["name", "totalQuantity", "assigned", "expiryDate"].includes(params.sort ?? "")
    ? params.sort
    : "expiryDate") as SortField;
  const sortOrder = (params.order === "asc" || params.order === "desc" ? params.order : "asc") as SortOrder;

  const licenses = await prisma.license.findMany({
    select: {
      id: true,
      name: true,
      isVolumeLicense: true,
      totalQuantity: true,
      price: true,
      purchaseDate: true,
      expiryDate: true,
      noticePeriodDays: true,
      adminName: true,
      assignments: {
        where: { returnedDate: null },
        select: {
          id: true,
          employeeId: true,
          employee: { select: { name: true, department: true } },
        },
      },
      seats: {
        select: {
          id: true,
          key: true,
        },
      },
    },
  });

  const enriched = licenses.map((license) => {
    const assignedCount = license.assignments.length;
    const maxCapacity = license.isVolumeLicense ? license.totalQuantity : license.seats.length || license.totalQuantity;
    const missingKeyCount = license.isVolumeLicense ? 0 : license.seats.filter((s) => s.key === null).length;
    return {
      ...license,
      assignedCount,
      maxCapacity,
      missingKeyCount,
      remainingCount: maxCapacity - assignedCount,
      assignedEmployeeIds: license.assignments.map((a) => a.employeeId),
      assignedEmployees: license.assignments.map((a) => ({
        assignmentId: a.id,
        employeeId: a.employeeId,
        employeeName: a.employee.name,
        department: a.employee.department,
      })),
    };
  });

  enriched.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "name":
        cmp = a.name.localeCompare(b.name, "ko");
        break;
      case "totalQuantity":
        cmp = a.totalQuantity - b.totalQuantity;
        break;
      case "assigned":
        cmp = a.assignedCount - b.assignedCount;
        break;
      case "expiryDate": {
        const aTime = a.expiryDate?.getTime() ?? Infinity;
        const bTime = b.expiryDate?.getTime() ?? Infinity;
        cmp = aTime - bTime;
        break;
      }
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  function sortUrl(field: SortField): string {
    const nextOrder = sortField === field && sortOrder === "asc" ? "desc" : "asc";
    return `/licenses?sort=${field}&order=${nextOrder}`;
  }

  function sortIndicator(field: SortField): string {
    if (sortField !== field) return "";
    return sortOrder === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">라이선스 목록</h1>
          <Link
            href="/licenses/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 새 라이선스
          </Link>
        </div>

        {enriched.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">등록된 라이선스가 없습니다.</p>
            <Link
              href="/licenses/new"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              첫 번째 라이선스를 등록하세요 &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {SORTABLE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      <Link
                        href={sortUrl(col.key)}
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                      >
                        {col.label}
                        <span className="text-blue-500">{sortIndicator(col.key)}</span>
                      </Link>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">담당자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">해지 통보</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enriched.map((license) => {
                  const badge = getNoticeBadge(license.expiryDate, license.noticePeriodDays);
                  const pct = license.maxCapacity > 0
                    ? Math.round((license.assignedCount / license.maxCapacity) * 100)
                    : 0;
                  const barColor =
                    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-blue-500";

                  return (
                    <LicenseRow key={license.id} id={license.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <span className="inline-flex items-center gap-1.5">
                          {license.name}
                          {license.isVolumeLicense && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                              Volume
                            </span>
                          )}
                          {!license.isVolumeLicense && license.missingKeyCount > 0 && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              키 미등록 {license.missingKeyCount}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                        {license.maxCapacity}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm tabular-nums text-gray-600">
                            {license.assignedCount} / {license.maxCapacity}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {license.expiryDate?.toLocaleDateString("ko-KR") ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right tabular-nums">
                        {formatPrice(license.price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {license.adminName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {badge ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[badge.variant]}`}>
                            {badge.label}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AssignButton
                            licenseId={license.id}
                            licenseName={license.name}
                            remaining={license.remainingCount}
                            employees={employees}
                            assignedEmployeeIds={license.assignedEmployeeIds}
                            isVolumeLicense={license.isVolumeLicense}
                          />
                          <UnassignButton
                            licenseName={license.name}
                            assignedEmployees={license.assignedEmployees}
                          />
                          <DeleteButton id={license.id} name={license.name} />
                        </div>
                      </td>
                    </LicenseRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
