import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import UserTable from "./user-table";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; role?: string }>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const me = await requireAdmin();
  const { q, role } = await searchParams;

  const roleFilter =
    role === "ADMIN" || role === "USER" ? role : undefined;

  const users = await prisma.user.findMany({
    where: {
      AND: [
        q ? { username: { contains: q } } : {},
        roleFilter ? { role: roleFilter } : {},
      ],
    },
    select: {
      id:        true,
      username:  true,
      role:      true,
      isActive:  true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
            <p className="mt-1 text-sm text-gray-500">
              관리자만 이 페이지에 접근할 수 있습니다.
            </p>
          </div>
          <Link
            href="/licenses"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; 목록으로
          </Link>
        </div>

        {/* 검색 / 필터 */}
        <form
          method="get"
          action="/admin/users"
          className="mb-4 flex flex-wrap gap-2"
        >
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="사용자명 검색..."
            className="input flex-1 min-w-48"
          />
          <select
            name="role"
            defaultValue={role ?? ""}
            className="input w-32"
          >
            <option value="">전체 역할</option>
            <option value="ADMIN">관리자</option>
            <option value="USER">일반</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            검색
          </button>
          {(q || role) && (
            <Link
              href="/admin/users"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              초기화
            </Link>
          )}
        </form>

        <UserTable
          users={users}
          currentUserId={me.id}
        />
      </div>
    </div>
  );
}
