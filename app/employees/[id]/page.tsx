import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, History } from "lucide-react";
import ManageLicenses from "./manage-licenses";
import OrgEditForm from "./org-edit-form";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employeeId = Number(id);

  const [employee, companies] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignments: {
          include: {
            license: true,
            seat: { select: { key: true } },
          },
          orderBy: { assignedDate: "desc" },
        },
      },
    }),
    prisma.orgCompany.findMany({
      include: {
        orgs: { orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!employee) notFound();

  const assignmentHistory = await prisma.assignmentHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      licenseId: true,
      action: true,
      reason: true,
      createdAt: true,
      assignment: { select: { license: { select: { name: true } } } },
    },
  });

  // All licenses for the assign modal
  const allLicenses = await prisma.license.findMany({
    select: {
      id: true,
      name: true,
      totalQuantity: true,
      assignments: {
        where: { returnedDate: null },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const activeAssignments = employee.assignments.filter((a) => !a.returnedDate);
  const pastAssignments = employee.assignments.filter((a) => a.returnedDate);

  // Prepare license data for manage panel
  const assignedLicenseIds = new Set(activeAssignments.map((a) => a.licenseId));
  const availableLicenses = allLicenses
    .filter((l) => !assignedLicenseIds.has(l.id))
    .map((l) => ({
      id: l.id,
      name: l.name,
      remaining: l.totalQuantity - l.assignments.length,
    }));

  const assignedForManage = activeAssignments.map((a) => ({
    assignmentId: a.id,
    licenseId: a.licenseId,
    licenseName: a.license.name,
    licenseType: a.license.licenseType as "NO_KEY" | "KEY_BASED" | "VOLUME",
    seatKey: a.seat?.key ?? null,
    volumeKey: a.license.licenseType === "VOLUME" ? a.license.key : null,
    assignedDate: a.assignedDate.toLocaleDateString("ko-KR"),
    reason: a.reason,
  }));

  // Merge history
  type HistoryEntry = {
    id: string;
    action: string;
    description: string;
    createdAt: Date;
  };

  const history: HistoryEntry[] = assignmentHistory.map((h) => {
    const licenseName = h.assignment?.license?.name ?? `License #${h.licenseId}`;
    const actionLabel = h.action === "ASSIGNED" ? "할당" : h.action === "RETURNED" ? "반납" : "해제";
    return {
      id: `ah-${h.id}`,
      action: h.action,
      description: `${licenseName} — ${actionLabel}${h.reason ? ` (${h.reason})` : ""}`,
      createdAt: h.createdAt,
    };
  });

  history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const displayHistory = history.slice(0, 30);

  const totalHistoryCount = assignmentHistory.length;

  const actionBadge: Record<string, string> = {
    ASSIGNED: "text-green-700 bg-green-50",
    RETURNED: "text-yellow-700 bg-yellow-50",
    REVOKED: "text-red-700 bg-red-50",
    UNASSIGNED: "text-red-700 bg-red-50",
    CREATED: "text-purple-700 bg-purple-50",
    UPDATED: "text-blue-700 bg-blue-50",
    IMPORTED: "text-indigo-700 bg-indigo-50",
  };

  const actionLabelMap: Record<string, string> = {
    ASSIGNED: "할당",
    RETURNED: "반납",
    REVOKED: "해제",
    UNASSIGNED: "해제",
    CREATED: "생성",
    UPDATED: "수정",
    IMPORTED: "가져오기",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
          <Link href="/employees" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; 목록으로
          </Link>
        </div>

        {/* Asset Overview Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-medium uppercase text-gray-500">활성 라이선스</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{activeAssignments.length}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <span className="text-xs font-medium uppercase text-gray-500">총 이력</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalHistoryCount}</p>
          </div>
        </div>

        {/* Employee Info */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <dl className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">이름</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">부서</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.department}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">이메일</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.email ?? "—"}</dd>
            </div>
          </dl>
          <div className="border-t border-gray-100 pt-4">
            <OrgEditForm
              employeeId={employee.id}
              initialTitle={employee.title ?? null}
              initialCompanyId={employee.companyId ?? null}
              initialOrgId={employee.orgId ?? null}
              initialSubOrgId={employee.subOrgId ?? null}
              companies={companies}
            />
          </div>
        </div>

        {/* Manage Licenses - bulk assign/unassign */}
        <ManageLicenses
          employeeId={employee.id}
          assigned={assignedForManage}
          availableLicenses={availableLicenses}
        />

        {/* Past Assignments */}
        {pastAssignments.length > 0 && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              반납 이력 ({pastAssignments.length})
            </h2>
            <div className="mb-6 overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">라이선스</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">할당일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">반납일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pastAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <Link href={`/licenses/${a.licenseId}`} className="text-blue-600 hover:underline">
                          {a.license.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {a.assignedDate.toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {a.returnedDate?.toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* History Timeline */}
        {displayHistory.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">최근 이력</h2>
              <Link
                href={`/history?entityType=EMPLOYEE&entityId=${employeeId}`}
                className="text-sm text-blue-600 hover:underline"
              >
                전체 보기 &rarr;
              </Link>
            </div>
            <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <div className="divide-y divide-gray-100">
                {displayHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${actionBadge[h.action] ?? "text-gray-700 bg-gray-50"}`}>
                      {actionLabelMap[h.action] ?? h.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900">{h.description}</p>
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">
                      {h.createdAt.toLocaleDateString("ko-KR")}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
