"use client";

import { useState } from "react";
import { deleteLicense } from "./[id]/actions";

export default function DeleteButton({ id, name }: { id: number; name: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    if (!window.confirm(`"${name}" 라이선스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    setIsDeleting(true);
    await deleteLicense(id);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDeleting}
      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isDeleting ? "..." : "삭제"}
    </button>
  );
}
