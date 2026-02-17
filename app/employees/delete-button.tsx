"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteEmployeeButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${name}" 조직원을 삭제하시겠습니까?\n활성 라이선스 배정이 모두 해제됩니다.`)) return;

    setIsPending(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      삭제
    </button>
  );
}
