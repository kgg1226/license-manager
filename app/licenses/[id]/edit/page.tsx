import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import EditLicenseForm from "./edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLicensePage({ params }: Props) {
  const editUser = await getCurrentUser().catch(() => null);
  if (!editUser) redirect("/login");
  const { id } = await params;
  const license = await prisma.license.findUnique({
    where: { id: Number(id) },
    include: {
      seats: {
        include: {
          assignments: {
            where: { returnedDate: null },
            select: {
              id: true,
              employee: { select: { name: true, department: true } },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!license) notFound();

  const seats = license.seats.map((s) => ({
    id: s.id,
    key: s.key,
    assignedTo: s.assignments[0]
      ? { name: s.assignments[0].employee.name, department: s.assignments[0].employee.department }
      : null,
  }));

  // 상위 라이선스 선택용 목록 (자신 제외)
  const allLicenses = await prisma.license.findMany({
    where: { id: { not: Number(id) }, parentId: null }, // 이미 하위 라이선스인 것은 상위가 될 수 없음
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <EditLicenseForm license={license} seats={seats} allLicenses={allLicenses} />;
}
