import { prisma } from "@/lib/prisma";
import NewGroupForm from "./new-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  const licenses = await prisma.license.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">그룹 생성</h1>
          <Link href="/settings/groups" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; 목록으로
          </Link>
        </div>
        <NewGroupForm licenses={licenses} />
      </div>
    </div>
  );
}
