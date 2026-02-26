"use client";

import { useState, useMemo } from "react";
import { assignLicenses, unassignLicenses } from "@/lib/assignment-actions";
import { useToast } from "@/app/toast";

type LicenseType = "NO_KEY" | "KEY_BASED" | "VOLUME";

type AssignedLicense = {
  assignmentId: number;
  licenseId: number;
  licenseName: string;
  licenseType: LicenseType;
  seatKey: string | null;
  volumeKey: string | null;
  assignedDate: string;
  reason: string | null;
};

type AvailableLicense = {
  id: number;
  name: string;
  remaining: number;
};

export default function ManageLicenses({
  employeeId,
  assigned,
  availableLicenses,
}: {
  employeeId: number;
  assigned: AssignedLicense[];
  availableLicenses: AvailableLicense[];
}) {
  const { toast } = useToast();

  // Unassign state
  const [selectedUnassign, setSelectedUnassign] = useState<Set<number>>(new Set());
  const [isPendingUnassign, setIsPendingUnassign] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState(false);

  // Assign state
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAssign, setSelectedAssign] = useState<Set<number>>(new Set());
  const [isPendingAssign, setIsPendingAssign] = useState(false);

  const filteredAvailable = useMemo(() => {
    const available = availableLicenses.filter((l) => l.remaining > 0);
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter((l) => l.name.toLowerCase().includes(q));
  }, [availableLicenses, search]);

  // Unassign handlers
  function toggleUnassign(id: number) {
    setSelectedUnassign((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllUnassign() {
    if (selectedUnassign.size === assigned.length) {
      setSelectedUnassign(new Set());
    } else {
      setSelectedUnassign(new Set(assigned.map((a) => a.assignmentId)));
    }
  }

  async function handleUnassign() {
    setConfirmUnassign(false);
    setIsPendingUnassign(true);
    const result = await unassignLicenses(employeeId, Array.from(selectedUnassign));
    setIsPendingUnassign(false);
    if (result.success) {
      toast(result.message, "success");
      setSelectedUnassign(new Set());
    } else {
      toast(result.message, "error");
    }
  }

  // Assign handlers
  function toggleAssign(id: number) {
    setSelectedAssign((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    setIsPendingAssign(true);
    const result = await assignLicenses(employeeId, Array.from(selectedAssign));
    setIsPendingAssign(false);
    if (result.success) {
      toast(result.message, "success");
      setSelectedAssign(new Set());
      setShowAssign(false);
      setSearch("");
    } else {
      toast(result.message, "error");
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          활성 라이선스 ({assigned.length})
        </h2>
        <div className="flex gap-2">
          {selectedUnassign.size > 0 && (
            <button
              onClick={() => setConfirmUnassign(true)}
              disabled={isPendingUnassign}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isPendingUnassign ? "처리 중..." : `${selectedUnassign.size}건 해제`}
            </button>
          )}
          <button
            onClick={() => setShowAssign(!showAssign)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            {showAssign ? "닫기" : "+ 라이선스 할당"}
          </button>
        </div>
      </div>

      {/* Assign panel */}
      {showAssign && (
        <div className="mb-4 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">라이선스 할당</h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="라이선스 검색..."
            className="input mb-2"
          />
          <div className="max-h-48 overflow-y-auto rounded-md border border-blue-200 bg-white">
            {filteredAvailable.length === 0 ? (
              <p className="p-3 text-center text-sm text-gray-500">할당 가능한 라이선스가 없습니다.</p>
            ) : (
              filteredAvailable.map((l) => (
                <label
                  key={l.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    selectedAssign.has(l.id) ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAssign.has(l.id)}
                    onChange={() => toggleAssign(l.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="flex-1 font-medium text-gray-900">{l.name}</span>
                  <span className="text-xs text-gray-500">잔여 {l.remaining}</span>
                </label>
              ))
            )}
          </div>
          {selectedAssign.size > 0 && (
            <button
              onClick={handleAssign}
              disabled={isPendingAssign}
              className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPendingAssign ? "할당 중..." : `${selectedAssign.size}건 할당`}
            </button>
          )}
        </div>
      )}

      {/* Assigned licenses table with checkboxes */}
      {assigned.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-500">할당된 라이선스가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUnassign.size === assigned.length}
                    onChange={toggleAllUnassign}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">라이선스</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">키</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">할당일</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assigned.map((a) => {
                const key = a.licenseType === "VOLUME"
                  ? a.volumeKey
                  : a.licenseType === "KEY_BASED"
                    ? a.seatKey
                    : null;
                return (
                  <tr
                    key={a.assignmentId}
                    className={`transition-colors ${
                      selectedUnassign.has(a.assignmentId) ? "bg-orange-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUnassign.has(a.assignmentId)}
                        onChange={() => toggleUnassign(a.assignmentId)}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.licenseName}</td>
                    <td className="px-4 py-3 text-sm">
                      {key
                        ? <span className="font-mono text-gray-600">{key}</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.assignedDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{a.reason ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm unassign dialog */}
      {confirmUnassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">할당 해제 확인</h3>
            <p className="mb-1 text-sm text-gray-600">
              선택한 {selectedUnassign.size}건의 라이선스 할당을 해제하시겠습니까?
            </p>
            <p className="mb-4 text-xs text-gray-500">이 작업은 이력에 기록됩니다.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmUnassign(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleUnassign}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                해제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
