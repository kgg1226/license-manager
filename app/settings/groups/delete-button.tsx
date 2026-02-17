"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteGroupButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${name}" 그룹을 삭제하시겠습니까?\n기존 라이선스 배정은 유지됩니다.`)) return;

    setIsPending(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
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
