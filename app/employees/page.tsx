import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteEmployeeButton from "./delete-button";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    include: {
      assignments: {
        where: { returnedDate: null },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">조직원 목록</h1>
          <Link
            href="/employees/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 새 조직원
          </Link>
        </div>

        {employees.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">등록된 조직원이 없습니다.</p>
            <Link
              href="/employees/new"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              첫 번째 조직원을 등록하세요 &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">부서</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">이메일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">배정 라이선스</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/employees/${emp.id}`} className="hover:text-blue-600 hover:underline">
                        {emp.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.email ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{emp.assignments.length}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          상세
                        </Link>
                        <DeleteEmployeeButton id={emp.id} name={emp.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
