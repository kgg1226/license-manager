"use client";

import { useState, useMemo } from "react";
import { assignLicenses } from "@/lib/assignment-actions";
import { useToast } from "@/app/toast";

type Employee = { id: number; name: string; department: string };

export default function AssignButton({
  licenseId,
  licenseName,
  remaining,
  employees,
  assignedEmployeeIds,
  isVolumeLicense = false,
}: {
  licenseId: number;
  licenseName: string;
  remaining: number;
  employees: Employee[];
  assignedEmployeeIds: number[];
  isVolumeLicense?: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, setIsPending] = useState(false);

  const assignedSet = useMemo(() => new Set(assignedEmployeeIds), [assignedEmployeeIds]);

  const available = useMemo(() => {
    const list = employees.filter((e) => !assignedSet.has(e.id));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
    );
  }, [employees, assignedSet, search]);

  function toggleSelect(empId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        // Don't exceed remaining capacity
        if (next.size >= remaining) return prev;
        next.add(empId);
      }
      return next;
    });
  }

  async function handleAssign() {
    if (selected.size === 0) return;
    setIsPending(true);

    // Assign the license to each selected employee
    let totalAssigned = 0;
    const errors: string[] = [];

    for (const empId of selected) {
      const result = await assignLicenses(empId, [licenseId]);
      if (result.success) {
        totalAssigned += result.count ?? 0;
      } else {
        errors.push(result.message);
      }
    }

    setIsPending(false);

    if (totalAssigned > 0) {
      toast(`${totalAssigned}명 배정 완료`, "success");
      close();
    }
    if (errors.length > 0) {
      toast(errors.join(", "), "error");
    }
  }

  function close() {
    setOpen(false);
    setSearch("");
    setSelected(new Set());
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={remaining <= 0}
        className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
        title={remaining <= 0 ? "잔여 수량 없음" : `배정 (잔여 ${remaining})`}
      >
        배정
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              라이선스 배정
              {isVolumeLicense && (
                <span className="ml-2 rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                  Volume License
                </span>
              )}
            </h3>
            <p className="mb-1 text-sm text-gray-500">
              {licenseName} — 잔여 {remaining}개
            </p>
            {selected.size > 0 && (
              <p className="mb-1 text-xs text-blue-600">
                {selected.size}명 선택 / 잔여 {remaining}개
                {selected.size >= remaining && (
                  <span className="ml-1 text-amber-600">(최대)</span>
                )}
              </p>
            )}
            {isVolumeLicense && (
              <p className="mb-3 text-xs text-purple-600">
                이 키는 배정 대상자와 공유됩니다.
              </p>
            )}
            {!isVolumeLicense && <div className="mb-2" />}

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 부서로 검색..."
              autoFocus
              className="input mb-3"
            />

            <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
              {available.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">
                  {employees.length === assignedSet.size ? "모든 조직원에게 이미 배정되었습니다." : "검색 결과가 없습니다."}
                </p>
              ) : (
                available.map((emp) => {
                  const isChecked = selected.has(emp.id);
                  const isDisabled = !isChecked && selected.size >= remaining;
                  return (
                    <label
                      key={emp.id}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        isChecked
                          ? "bg-blue-50"
                          : isDisabled
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => toggleSelect(emp.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="flex-1 font-medium text-gray-900">{emp.name}</span>
                      <span className="text-xs text-gray-500">{emp.department}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={close}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                닫기
              </button>
              {selected.size > 0 && (
                <button
                  onClick={handleAssign}
                  disabled={isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "배정 중..." : `${selected.size}명 배정`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
