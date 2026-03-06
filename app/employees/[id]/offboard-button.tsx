"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function OffboardButton({
  employeeId,
  employeeName,
  currentStatus,
}: {
  employeeId: number;
  employeeName: string;
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (currentStatus !== "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        <LogOut className="h-3.5 w-3.5" />
        퇴사 처리 중
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-300 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        퇴사 처리
      </button>

      {open && (
        <OffboardModal
          employeeId={employeeId}
          employeeName={employeeName}
          onClose={() => setOpen(false)}
          onDone={() => { router.refresh(); setOpen(false); }}
        />
      )}
    </>
  );
}

function OffboardModal({
  employeeId,
  employeeName,
  onClose,
  onDone,
}: {
  employeeId: number;
  employeeName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch(`/api/employees/${employeeId}/offboard`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "퇴사 처리 실패");
        return;
      }
      const until = data.offboardingUntil
        ? new Date(data.offboardingUntil).toLocaleDateString("ko-KR")
        : "";
      setResult(until);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          퇴사 처리 — {employeeName}
        </h3>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
              <p className="font-medium">퇴사 처리가 완료되었습니다.</p>
              <p className="mt-1 text-xs">
                유예 기간 종료일: <strong>{result}</strong>
                <br />
                7일 후 계정이 자동으로 삭제됩니다.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onDone}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">주의</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                <li>구성원 상태가 <strong>퇴사 처리 중</strong>으로 변경됩니다.</li>
                <li>7일 유예 기간 후 계정이 자동 삭제됩니다.</li>
                <li>보유 라이선스는 즉시 반납되지 않습니다.</li>
              </ul>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "퇴사 처리"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
