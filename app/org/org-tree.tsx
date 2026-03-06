"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Building2, Users, Edit2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

interface DeletePreview {
  target: { id: number; name: string };
  descendants: Array<{ id: number; name: string; depth: number }>;
  descendantCount: number;
  affectedMemberCount: number;
}

function OrgUnitNode({
  unit,
  subUnits,
  companyId,
  allOrgs,
  onRefresh,
}: {
  unit: OrgUnit;
  subUnits: OrgUnit[];
  companyId: number;
  allOrgs: OrgUnit[];
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");

  const hasChildren = subUnits.length > 0;

  const handleEdit = async () => {
    if (!editName.trim()) {
      toast.error("부서명은 필수입니다.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/org/units/${unit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "부서 수정에 실패했습니다.");
        return;
      }

      toast.success("부서가 수정되었습니다.");
      setEditingId(null);
      await onRefresh();
    } catch (error) {
      console.error("Failed to edit org unit:", error);
      toast.error("부서 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/org/units/${unit.id}/delete-preview`);
      if (!res.ok) {
        toast.error("삭제 정보 조회에 실패했습니다.");
        return;
      }
      const preview = await res.json();
      setDeletePreview(preview);
      setShowDeleteConfirm(true);
    } catch (error) {
      console.error("Failed to fetch delete preview:", error);
      toast.error("삭제 정보 조회에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== "삭제하겠습니다") {
      toast.error('정확히 "삭제하겠습니다"를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/org/units/${unit.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "삭제하겠습니다" }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "부서 삭제에 실패했습니다.");
        return;
      }

      toast.success("부서가 삭제되었습니다.");
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      await onRefresh();
    } catch (error) {
      console.error("Failed to delete org unit:", error);
      toast.error("부서 삭제에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) {
      toast.error("부서명은 필수입니다.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/org/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChildName.trim(),
          companyId,
          parentId: unit.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "부서 생성에 실패했습니다.");
        return;
      }

      toast.success("부서가 생성되었습니다.");
      setShowAddChild(false);
      setNewChildName("");
      await onRefresh();
    } catch (error) {
      console.error("Failed to create org unit:", error);
      toast.error("부서 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = () => {
    setEditName(unit.name);
    setEditingId(unit.id);
  };

  return (
    <div className="ml-4">
      {/* 노드 헤더 */}
      <div className="flex items-center gap-1.5 py-2">
        <div
          className="cursor-pointer"
          onClick={() => hasChildren && setOpen(!open)}
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </div>

        <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />

        {editingId === unit.id ? (
          <div className="flex gap-1.5 flex-1">
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
                if (e.key === "Escape") setEditingId(null);
              }}
            />
            <button
              onClick={handleEdit}
              disabled={isLoading}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              저장
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm text-gray-700 flex-1">{unit.name}</span>
            <button
              onClick={startEdit}
              className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"
              title="수정"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isLoading}
              className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 disabled:opacity-50"
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowAddChild(true)}
              className="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-green-50"
              title="하위 부서 추가"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* 하위 부서 추가 입력 */}
      {showAddChild && (
        <div className="ml-4 flex gap-1.5 py-2">
          <input
            autoFocus
            type="text"
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            placeholder="부서명"
            className="flex-1 border border-green-300 rounded px-2 py-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") {
                setShowAddChild(false);
                setNewChildName("");
              }
            }}
          />
          <button
            onClick={handleAddChild}
            disabled={isLoading}
            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            생성
          </button>
          <button
            onClick={() => {
              setShowAddChild(false);
              setNewChildName("");
            }}
            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            취소
          </button>
        </div>
      )}

      {/* 하위 노드 */}
      {open && hasChildren && (
        <div>
          {subUnits.map((s) => (
            <OrgUnitNode
              key={s.id}
              unit={s}
              subUnits={allOrgs.filter((o) => o.parentId === s.id)}
              companyId={companyId}
              allOrgs={allOrgs}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && deletePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">부서 삭제 확인</h3>

            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
              <p className="font-medium mb-2">
                "{deletePreview.target.name}" 부서를 삭제하면 다음이 영향을 받습니다:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  하위 부서 {deletePreview.descendantCount}개
                  {deletePreview.descendants.length > 0 && (
                    <ul className="list-disc pl-5 mt-1 text-red-600">
                      {deletePreview.descendants.slice(0, 5).map((d) => (
                        <li key={d.id} style={{ marginLeft: `${d.depth * 16}px` }}>
                          {d.name}
                        </li>
                      ))}
                      {deletePreview.descendants.length > 5 && (
                        <li>... 외 {deletePreview.descendants.length - 5}개</li>
                      )}
                    </ul>
                  )}
                </li>
                <li>
                  영향을 받는 구성원 {deletePreview.affectedMemberCount}명
                </li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                다음 문구를 정확히 입력하세요: <span className="font-mono">삭제하겠습니다</span>
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="삭제하겠습니다"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={
                  isLoading || deleteConfirmText !== "삭제하겠습니다"
                }
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyNode({
  company,
  onRefresh,
}: {
  company: Company;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const topOrgs = company.orgs.filter((o) => o.parentId === null);

  const handleAddRootOrg = async () => {
    if (!newRootName.trim()) {
      toast.error("부서명은 필수입니다.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/org/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRootName.trim(),
          companyId: company.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "부서 생성에 실패했습니다.");
        return;
      }

      toast.success("부서가 생성되었습니다.");
      setShowAddRoot(false);
      setNewRootName("");
      await onRefresh();
    } catch (error) {
      console.error("Failed to create org unit:", error);
      toast.error("부서 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div
        className="flex cursor-pointer items-center gap-2 p-4"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
        )}
        <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
        <span className="font-medium text-gray-900">{company.name}</span>
        <span className="ml-auto text-xs text-gray-400">
          {company.orgs.length}개 조직
        </span>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2">
          {topOrgs.length > 0 && (
            <div className="mb-3">
              {topOrgs.map((org) => {
                const subs = company.orgs.filter((o) => o.parentId === org.id);
                return (
                  <OrgUnitNode
                    key={org.id}
                    unit={org}
                    subUnits={subs}
                    companyId={company.id}
                    allOrgs={company.orgs}
                    onRefresh={onRefresh}
                  />
                );
              })}
            </div>
          )}

          {/* 최상위 부서 추가 */}
          {showAddRoot ? (
            <div className="flex gap-1.5 py-2">
              <input
                autoFocus
                type="text"
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                placeholder="부서명"
                className="flex-1 border border-green-300 rounded px-2 py-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddRootOrg();
                  if (e.key === "Escape") {
                    setShowAddRoot(false);
                    setNewRootName("");
                  }
                }}
              />
              <button
                onClick={handleAddRootOrg}
                disabled={isLoading}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                생성
              </button>
              <button
                onClick={() => {
                  setShowAddRoot(false);
                  setNewRootName("");
                }}
                className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRoot(true)}
              className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100"
            >
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              부서 추가
            </button>
          )}

          {topOrgs.length === 0 && !showAddRoot && (
            <p className="text-xs text-gray-400">등록된 조직이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgTree({
  companies: initialCompanies,
  onRefresh,
}: {
  companies: Company[];
  onRefresh: () => Promise<void>;
}) {
  return (
    <div>
      {initialCompanies.map((c) => (
        <CompanyNode key={c.id} company={c} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
