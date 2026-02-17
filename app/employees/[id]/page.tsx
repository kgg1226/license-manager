import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

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
  });

  const activeAssignments = employee.assignments.filter((a) => !a.returnedDate);
  const pastAssignments = employee.assignments.filter((a) => a.returnedDate);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
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

        {/* Active Assignments */}
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          활성 라이선스 ({activeAssignments.length})
        </h2>
        {activeAssignments.length === 0 ? (
          <div className="mb-6 rounded-lg bg-white p-6 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">배정된 라이선스가 없습니다.</p>
          </div>
        ) : (
          <div className="mb-6 overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">라이선스</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">배정일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">사유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.license.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {a.assignedDate.toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{a.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

        {/* Assignment History */}
        {history.length > 0 && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              배정 이력 로그 ({history.length})
            </h2>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">일시</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">액션</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">사유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {h.createdAt.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            h.action === "ASSIGNED"
                              ? "bg-green-100 text-green-700"
                              : h.action === "RETURNED"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {h.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{h.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
