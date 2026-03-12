import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteEmployeeButton from "./delete-button";
import EmployeeSearch from "./employee-search";
import { getEmployeeDisplayNames } from "@/lib/employee-display";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; unassigned?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = (["ACTIVE", "OFFBOARDING"].includes(params.status ?? "")
    ? params.status
    : null) as "ACTIVE" | "OFFBOARDING" | null;
  const unassigned = params.unassigned === "true";

  const where: Record<string, unknown> = {};

  // 이름 또는 부서 검색
  if (query) {
    where.OR = [{ name: { contains: query, mode: "insensitive" } }, { department: { contains: query, mode: "insensitive" } }];
  }

  // 상태 필터
  if (status) {
    where.status = status;
  }

  const employees = await prisma.employee.findMany({
    where,
    include: {
      assignments: {
        where: { returnedDate: null },
      },
    },
    orderBy: { name: "asc" },
  });

  // 할당 라이선스 없는 구성원만 필터링
  const filtered = unassigned ? employees.filter((e) => e.assignments.length === 0) : employees;

  // 중복 이름 구분을 위한 표시명 계산
  const displayNames = getEmployeeDisplayNames(
    filtered.map((e) => ({ id: e.id, name: e.name, email: e.email }))
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">조직원 목록</h1>
          {user && (
            <Link
              href="/employees/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 새 조직원
            </Link>
          )}
        </div>

        {/* 검색·필터 */}
        <EmployeeSearch currentQuery={query} currentStatus={status} currentUnassigned={unassigned} />

        {/* 결과 */}
        {filtered.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">
              {employees.length === 0 ? "등록된 조직원이 없습니다." : "검색 결과가 없습니다."}
            </p>
            {employees.length === 0 && user && (
              <Link
                href="/employees/new"
                className="mt-3 inline-block text-sm text-blue-600 hover:underline"
              >
                첫 번째 조직원을 등록하세요 &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">소속</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">이메일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">배정 라이선스</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">상태</th>
                  {user && <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/employees/${emp.id}`} className="hover:text-blue-600 hover:underline">
                        {displayNames[emp.id]}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.department && emp.department !== "-" ? emp.department : "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.email ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{emp.assignments.length}</td>
                    <td className="px-4 py-3 text-sm">
                      {emp.status === "OFFBOARDING" ? (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          퇴사 예정
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          활성
                        </span>
                      )}
                    </td>
                    {user && (
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              총 <span className="font-medium">{filtered.length}</span>명 (
              {status && `${status === "ACTIVE" ? "활성" : "퇴사 예정"}`}
              {status && query && " + "}
              {query && `검색: "${query}"`}
              {unassigned && " + 미할당"}
              )
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
