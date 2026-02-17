import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteGroupButton from "./delete-button";
import ToggleDefaultButton from "./toggle-default-button";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const groups = await prisma.licenseGroup.findMany({
    include: { members: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">라이선스 그룹</h1>
          <Link
            href="/settings/groups/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 새 그룹
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">등록된 그룹이 없습니다.</p>
            <Link
              href="/settings/groups/new"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              첫 번째 그룹을 만드세요 &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">그룹명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">설명</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">라이선스 수</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">기본 그룹</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{group.description ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{group.members.length}</td>
                    <td className="px-4 py-3 text-center">
                      <ToggleDefaultButton id={group.id} isDefault={group.isDefault} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/settings/groups/${group.id}`}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          수정
                        </Link>
                        <DeleteGroupButton id={group.id} name={group.name} />
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
