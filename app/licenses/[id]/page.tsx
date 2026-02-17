import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditLicenseForm from "./edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLicensePage({ params }: Props) {
  const { id } = await params;
  const license = await prisma.license.findUnique({
    where: { id: Number(id) },
  });

  if (!license) notFound();

  return <EditLicenseForm license={license} />;
}
