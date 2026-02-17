"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ToggleDefaultButton({ id, isDefault }: { id: number; isDefault: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: !isDefault }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        isDefault
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {isDefault ? "기본" : "—"}
    </button>
  );
}
