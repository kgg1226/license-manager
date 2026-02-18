import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditLicenseForm from "./edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLicensePage({ params }: Props) {
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

  return <EditLicenseForm license={license} seats={seats} />;
}
