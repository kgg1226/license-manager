import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditGroupForm from "./edit-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await prisma.licenseGroup.findUnique({
    where: { id: Number(id) },
    include: { members: true },
  });

  if (!group) notFound();

  const licenses = await prisma.license.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">그룹 수정</h1>
          <Link href="/settings/groups" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; 목록으로
          </Link>
        </div>
        <EditGroupForm group={group} licenses={licenses} />
      </div>
    </div>
  );
}
