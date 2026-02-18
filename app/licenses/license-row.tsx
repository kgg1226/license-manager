"use client";

import { useRouter } from "next/navigation";

export default function LicenseRow({
  id,
  children,
}: {
  id: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => router.push(`/licenses/${id}`)}
    >
      {children}
    </tr>
  );
}
