"use client";

import { useActionState, useState, useCallback } from "react";
import { updateLicense, deleteLicense, type FormState } from "./actions";
import Link from "next/link";

const NOTICE_OPTIONS = [
  { value: "", label: "설정 안 함" },
  { value: "30", label: "1개월 전 (30일)" },
  { value: "90", label: "3개월 전 (90일)" },
  { value: "custom", label: "직접 입력" },
] as const;

type License = {
  id: number;
  name: string;
  key: string | null;
  isVolumeLicense: boolean;
  totalQuantity: number;
  price: number | null;
  purchaseDate: Date;
  expiryDate: Date | null;
  contractDate: Date | null;
  noticePeriodDays: number | null;
  adminName: string | null;
  description: string | null;
};

type Seat = {
  id: number;
  key: string | null;
  assignedTo: { name: string; department: string } | null;
};

function toDateString(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function resolveNoticePeriodType(days: number | null): string {
  if (days === null) return "";
  if (days === 30) return "30";
  if (days === 90) return "90";
  return "custom";
}

export default function EditLicenseForm({
  license,
  seats: initialSeats,
}: {
  license: License;
  seats: Seat[];
}) {
  const initialState: FormState = {};
  const boundUpdate = updateLicense.bind(null, license.id);
  const [state, formAction, isPending] = useActionState(boundUpdate, initialState);

  const initialNoticeType = resolveNoticePeriodType(license.noticePeriodDays);
  const [noticePeriodType, setNoticePeriodType] = useState(initialNoticeType);
  const [isVolume, setIsVolume] = useState(license.isVolumeLicense);
  const [isDeleting, setIsDeleting] = useState(false);
  const [seats, setSeats] = useState(initialSeats);

  async function handleDelete() {
    if (!window.confirm("이 라이선스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }
    setIsDeleting(true);
    await deleteLicense(license.id);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">라이선스 수정</h1>
          <Link
            href={`/licenses/${license.id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; 상세로
          </Link>
        </div>

        {state.message && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {/* 기본 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              기본 정보
            </legend>

            <Field label="라이선스명" required error={state.errors?.name}>
              <input
                type="text"
                name="name"
                required
                defaultValue={license.name}
                className="input"
              />
            </Field>

            <Field label="라이선스 키">
              <input
                type="text"
                name="key"
                defaultValue={license.key ?? ""}
                className="input"
              />
            </Field>

            <label className="flex items-center gap-2">
              <input type="checkbox" name="isVolumeLicense" checked={isVolume} onChange={(e) => setIsVolume(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">볼륨 라이선스</span>
              <span className="text-xs text-gray-500">(하나의 키를 여러 명에게 배정 가능)</span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="수량" required error={state.errors?.totalQuantity}>
                <input
                  type="number"
                  name="totalQuantity"
                  min={1}
                  required
                  defaultValue={license.totalQuantity}
                  className="input"
                />
              </Field>

              <Field label="금액 (원)" error={state.errors?.price}>
                <input
                  type="number"
                  name="price"
                  min={0}
                  step="any"
                  defaultValue={license.price ?? ""}
                  className="input"
                />
              </Field>

              <Field label="담당자명">
                <input
                  type="text"
                  name="adminName"
                  defaultValue={license.adminName ?? ""}
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          {/* 시트 목록 (개별 라이선스) */}
          {!isVolume && seats.length > 0 && (
            <fieldset className="space-y-4">
              <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
                시트 ({seats.length}개)
              </legend>
              <SeatTable seats={seats} onSeatsChange={setSeats} />
            </fieldset>
          )}

          {/* 날짜 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              날짜 정보
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="구매일" required error={state.errors?.purchaseDate}>
                <input
                  type="date"
                  name="purchaseDate"
                  required
                  defaultValue={toDateString(license.purchaseDate)}
                  className="input"
                />
              </Field>

              <Field label="만료일">
                <input
                  type="date"
                  name="expiryDate"
                  defaultValue={toDateString(license.expiryDate)}
                  className="input"
                />
              </Field>

              <Field label="계약일">
                <input
                  type="date"
                  name="contractDate"
                  defaultValue={toDateString(license.contractDate)}
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          {/* 해지 통보 기한 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              해지 통보 기한
            </legend>

            <p className="text-xs text-gray-500">
              만료일로부터 며칠 전에 해지 통보가 필요한지 설정합니다.
            </p>

            <div className="flex flex-wrap gap-3">
              {NOTICE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                    noticePeriodType === opt.value
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="noticePeriodType"
                    value={opt.value}
                    checked={noticePeriodType === opt.value}
                    onChange={(e) => setNoticePeriodType(e.target.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {noticePeriodType === "custom" && (
              <Field label="통보 기한 (일)" error={state.errors?.noticePeriodCustom}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="noticePeriodCustom"
                    min={1}
                    defaultValue={
                      initialNoticeType === "custom"
                        ? license.noticePeriodDays ?? ""
                        : ""
                    }
                    placeholder="예: 60"
                    className="input max-w-32"
                  />
                  <span className="text-sm text-gray-500">일 전</span>
                </div>
              </Field>
            )}
          </fieldset>

          {/* 비고 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              비고
            </legend>

            <Field label="설명">
              <textarea
                name="description"
                rows={3}
                defaultValue={license.description ?? ""}
                className="input resize-y"
              />
            </Field>
          </fieldset>

          {/* 제출 / 삭제 */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-md px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>

            <div className="flex items-center gap-3">
              <Link
                href={`/licenses/${license.id}`}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SeatTable({
  seats,
  onSeatsChange,
}: {
  seats: Seat[];
  onSeatsChange: (seats: Seat[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dupError, setDupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback((seat: Seat) => {
    setEditingId(seat.id);
    setEditValue(seat.key ?? "");
    setDupError(null);
  }, []);

  async function handleSave(seatId: number) {
    const trimmed = editValue.trim();
    setSaving(true);
    setDupError(null);

    try {
      const res = await fetch(`/api/seats/${seatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDupError(data.error || "저장 실패");
        setSaving(false);
        return;
      }

      // Update local state
      onSeatsChange(
        seats.map((s) => (s.id === seatId ? { ...s, key: trimmed || null } : s))
      );
      setEditingId(null);
    } catch {
      setDupError("저장 실패");
    }
    setSaving(false);
  }

  function handleCancel() {
    setEditingId(null);
    setDupError(null);
  }

  const missingCount = seats.filter((s) => s.key === null).length;

  return (
    <div>
      {missingCount > 0 && (
        <p className="mb-2 text-xs text-amber-600">
          키 미등록 {missingCount}건
        </p>
      )}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">키</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">배정자</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {seats.map((seat, idx) => (
              <tr key={seat.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 tabular-nums">{idx + 1}</td>
                <td className="px-3 py-2">
                  {editingId === seat.id ? (
                    <div>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="input text-sm"
                        placeholder="라이선스 키 입력"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleSave(seat.id); }
                          if (e.key === "Escape") handleCancel();
                        }}
                      />
                      {dupError && (
                        <p className="mt-1 text-xs text-red-600">{dupError}</p>
                      )}
                    </div>
                  ) : (
                    <span className={seat.key ? "font-mono text-gray-900" : "text-gray-400 italic"}>
                      {seat.key ?? "미등록"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {seat.assignedTo ? (
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      사용 중
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      미배정
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {seat.assignedTo
                    ? `${seat.assignedTo.name} (${seat.assignedTo.department})`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  {editingId === seat.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSave(seat.id)}
                        disabled={saving}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {saving ? "..." : "저장"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(seat)}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      편집
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
