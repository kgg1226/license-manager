"use client";

import { useState } from "react";
import { unassignLicenses } from "@/lib/assignment-actions";
import { useToast } from "@/app/toast";
import Link from "next/link";

type LicenseType = "NO_KEY" | "KEY_BASED" | "VOLUME";

type AssignmentRow = {
  assignmentId: number;
  employeeId: number;
  employeeName: string;
  department: string;
  assignedDate: string;
  seatKey: string | null;
  licenseType: LicenseType;
  volumeKey: string | null;
};

export default function LicenseAssignments({
  licenseId,
  assignments,
}: {
  licenseId: number;
  assignments: AssignmentRow[];
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [confirm, setConfirm] = useState(false);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === assignments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assignments.map((a) => a.assignmentId)));
    }
  }

  async function handleUnassign() {
    setConfirm(false);
    setIsPending(true);

    const byEmployee = new Map<number, number[]>();
    for (const a of assignments) {
      if (selected.has(a.assignmentId)) {
        const list = byEmployee.get(a.employeeId) ?? [];
        list.push(a.assignmentId);
        byEmployee.set(a.employeeId, list);
      }
    }

    let total = 0;
    const errors: string[] = [];
    for (const [empId, ids] of byEmployee) {
      const result = await unassignLicenses(empId, ids);
      if (result.success) {
        total += result.count ?? 0;
      } else {
        errors.push(result.message);
      }
    }

    setIsPending(false);
    if (total > 0) {
      toast(`${total}건 할당 해제 완료`, "success");
      setSelected(new Set());
    }
    if (errors.length > 0) {
      toast(errors.join(", "), "error");
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          활성 할당 ({assignments.length})
        </h2>
        {selected.size > 0 && (
          <button
            onClick={() => setConfirm(true)}
            disabled={isPending}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? "처리 중..." : `${selected.size}건 해제`}
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-500">할당된 조직원이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === assignments.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  부서
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  키
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  배정일
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((a) => {
                const key = a.licenseType === "VOLUME"
                  ? a.volumeKey
                  : a.licenseType === "KEY_BASED"
                    ? a.seatKey
                    : null;
                return (
                  <tr
                    key={a.assignmentId}
                    className={`transition-colors ${selected.has(a.assignmentId) ? "bg-orange-50" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(a.assignmentId)}
                        onChange={() => toggle(a.assignmentId)}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/employees/${a.employeeId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {a.employeeName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {a.department}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {key ? (
                        <span className="font-mono text-gray-600">{key}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {a.assignedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm unassign dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              할당 해제 확인
            </h3>
            <p className="mb-1 text-sm text-gray-600">
              선택한 {selected.size}건의 할당을 해제하시겠습니까?
            </p>
            <p className="mb-4 text-xs text-gray-500">
              이 작업은 이력에 기록됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirm(false)}
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
