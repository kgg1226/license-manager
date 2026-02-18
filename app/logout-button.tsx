"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-100 disabled:opacity-50"
    >
      {isPending ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
