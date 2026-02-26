import { prisma } from "@/lib/prisma";
import OrgTree from "./org-tree";

export const dynamic = "force-dynamic";

export default async function OrgPage() {
  const companies = await prisma.orgCompany.findMany({
    include: {
      orgs: { orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">조직도</h1>
        </div>
        {companies.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">등록된 조직이 없습니다.</p>
          </div>
        ) : (
          <OrgTree companies={companies} />
        )}
      </div>
    </div>
  );
}
