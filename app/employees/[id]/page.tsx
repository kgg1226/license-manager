import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ManageLicenses from "./manage-licenses";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: Number(id) },
    include: {
      assignments: {
        include: { license: true },
        orderBy: { assignedDate: "desc" },
      },
    },
  });

  if (!employee) notFound();

  const history = await prisma.assignmentHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    take: 20,
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
    assignedDate: a.assignedDate.toLocaleDateString("ko-KR"),
    reason: a.reason,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
          <Link href="/employees" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; 목록으로
          </Link>
        </div>

        {/* Employee Info */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">배정일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">반납일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pastAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{a.license.name}</td>
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

        {/* Recent History Widget */}
        {history.length > 0 && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              최근 이력
            </h2>
            <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <div className="divide-y divide-gray-100">
                {history.map((h) => {
                  const licenseName = h.assignment?.license?.name ?? `License #${h.licenseId}`;
                  const actionLabel = h.action === "ASSIGNED" ? "배정" : h.action === "RETURNED" ? "반납" : "해제";
                  const actionColor = h.action === "ASSIGNED"
                    ? "text-green-700 bg-green-50"
                    : h.action === "RETURNED"
                      ? "text-yellow-700 bg-yellow-50"
                      : "text-red-700 bg-red-50";

                  return (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${actionColor}`}>
                        {actionLabel}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{licenseName}</p>
                        {h.reason && (
                          <p className="truncate text-xs text-gray-500">{h.reason}</p>
                        )}
                      </div>
                      <time className="shrink-0 text-xs text-gray-400">
                        {h.createdAt.toLocaleDateString("ko-KR")}
                      </time>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
