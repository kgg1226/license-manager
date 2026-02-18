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
  const [isPending, setIsPending] = useState(false);

  const assignedSet = useMemo(() => new Set(assignedEmployeeIds), [assignedEmployeeIds]);

  // Only show employees NOT already assigned to this license
  const available = useMemo(() => {
    const list = employees.filter((e) => !assignedSet.has(e.id));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
    );
  }, [employees, assignedSet, search]);

  async function handleAssign(employeeId: number) {
    setIsPending(true);
    const result = await assignLicenses(employeeId, [licenseId]);
    setIsPending(false);
    if (result.success) {
      toast(result.message, "success");
      setOpen(false);
      setSearch("");
    } else {
      toast(result.message, "error");
    }
  }

  function close() {
    setOpen(false);
    setSearch("");
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
            {isVolumeLicense && (
              <p className="mb-4 text-xs text-purple-600">
                이 키는 배정 대상자와 공유됩니다.
              </p>
            )}
            {!isVolumeLicense && <div className="mb-3" />}

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
                available.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleAssign(emp.id)}
                    disabled={isPending}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="font-medium text-gray-900">{emp.name}</span>
                    <span className="text-xs text-gray-500">{emp.department}</span>
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={close}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
