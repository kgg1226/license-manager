"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    // 유효성 검사
    if (!newPassword.trim()) {
      toast.error("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 비밀번호 강도 검증 (숫자, 대문자, 특수문자 포함 권장)
    const hasNumber = /\d/.test(newPassword);
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*]/.test(newPassword);

    if (!hasNumber || !hasUpperCase || !hasSpecialChar) {
      toast.warning(
        "권장: 비밀번호에 숫자, 대문자, 특수문자를 포함하세요.\n계속하려면 다시 클릭하세요."
      );
      return;
    }

    setIsLoading(true);
    try {
      // 먼저 세션에서 현재 사용자 ID 가져오기
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        toast.error("세션 정보를 가져올 수 없습니다.");
        return;
      }

      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated || !sessionData.user) {
        toast.error("인증이 필요합니다.");
        return;
      }

      const userId = sessionData.user.id;

      const res = await fetch(`/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "비밀번호 변경에 실패했습니다.");
        return;
      }

      toast.success("비밀번호가 변경되었습니다!");

      // 대시보드로 이동
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error("비밀번호 변경에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            비밀번호 변경 필수
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            관리자가 임시 비밀번호를 발급했습니다.
            <br />
            새로운 비밀번호를 설정해주세요.
          </p>

          <div className="space-y-4">
            {/* 새 비밀번호 입력 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                새 비밀번호 *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="최소 8자 이상"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                숫자, 대문자, 특수문자를 포함하면 더 안전합니다.
              </p>
            </div>

            {/* 비밀번호 확인 입력 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                비밀번호 확인 *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleChangePassword();
                }}
              />
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleChangePassword}
              disabled={isLoading || !newPassword || !confirmPassword}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>

          {/* 안내 문구 */}
          <div className="mt-6 space-y-3 rounded-lg bg-blue-50 p-4 text-xs text-blue-800">
            <p className="font-medium">보안 팁:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>이전에 사용한 비밀번호는 사용하지 마세요.</li>
              <li>개인정보를 포함하지 않으세요.</li>
              <li>다른 계정과 다른 비밀번호를 사용하세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
