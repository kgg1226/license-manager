"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

type OrgUnit = {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder?: number;
  memberCount?: number;
  children?: OrgUnit[];
};
type Company = { id: number; name: string; orgs: OrgUnit[] };

// ── 트리 구조 변환 ──────────────────────────────────────────────────────────
function buildTree(flat: OrgUnit[]): OrgUnit[] {
  const map = new Map<number, OrgUnit>();
  flat.forEach((u) => map.set(u.id, { ...u, children: [] }));
  const roots: OrgUnit[] = [];
  map.forEach((u) => {
    if (u.parentId === null) roots.push(u);
    else map.get(u.parentId!)?.children?.push(u);
  });
  return roots;
}

// ── 삭제 프리뷰 타입 ─────────────────────────────────────────────────────────
type DeletePreview = {
  target: { id: number; name: string };
  descendants: { id: number; name: string; depth: number }[];
  descendantCount: number;
  affectedMemberCount: number;
};

// ── 공통 Modal 래퍼 ──────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-5 text-base font-semibold text-gray-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ── 부서명 입력 모달 (생성/수정 공용) ────────────────────────────────────────
function UnitModal({
  title,
  defaultName = "",
  onClose,
  onSubmit,
}: {
  title: string;
  defaultName?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("부서명을 입력하세요.");
      return;
    }
    startTransition(async () => {
      try {
        await onSubmit(name.trim());
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "오류 발생");
      }
    });
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            부서명
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            autoFocus
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
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
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "처리 중..." : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── 삭제 확인 모달 ───────────────────────────────────────────────────────────
function DeleteModal({
  unit,
  onClose,
  onDeleted,
}: {
  unit: OrgUnit;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch(`/api/org/units/${unit.id}/delete-preview`)
      .then((r) => r.json())
      .then((data) => setPreview(data))
      .catch(() => setError("프리뷰 로드 실패"))
      .finally(() => setLoadingPreview(false));
  }, [unit.id]);

  function handleDelete() {
    if (confirm !== "삭제하겠습니다") {
      setError("확인 문구가 일치하지 않습니다.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/org/units/${unit.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "삭제 실패");
        return;
      }
      onDeleted();
      onClose();
    });
  }

  return (
    <Modal title={`부서 삭제 — ${unit.name}`} onClose={onClose}>
      {loadingPreview ? (
        <p className="py-4 text-center text-sm text-gray-500">
          영향 범위 분석 중...
        </p>
      ) : preview ? (
        <div className="space-y-4">
          {(preview.descendantCount > 0 || preview.affectedMemberCount > 0) && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">삭제 영향 범위</p>
              {preview.descendants.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs">
                  {preview.descendants.map((d) => (
                    <li key={d.id}>
                      {"　".repeat(d.depth)}
                      {d.name}
                    </li>
                  ))}
                </ul>
              )}
              {preview.affectedMemberCount > 0 && (
                <p className="mt-1 text-xs">
                  영향받는 구성원:{" "}
                  <strong>{preview.affectedMemberCount}명</strong> (미소속으로
                  이동)
                </p>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-sm text-gray-700">
              확인을 위해{" "}
              <strong className="font-mono">삭제하겠습니다</strong>를
              입력하세요.
            </p>
            <input
              type="text"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError("");
              }}
              placeholder="삭제하겠습니다"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending || confirm !== "삭제하겠습니다"}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-red-600">
          {error || "프리뷰 로드 실패"}
        </p>
      )}
    </Modal>
  );
}

// ── OrgUnit 노드 ─────────────────────────────────────────────────────────────
function OrgUnitNode({
  unit,
  companyId,
  onRefresh,
}: {
  unit: OrgUnit;
  companyId: number;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [modal, setModal] = useState<"edit" | "add-child" | "delete" | null>(
    null
  );
  const hasChildren = (unit.children?.length ?? 0) > 0;

  return (
    <div className="ml-4">
      <div className="group flex items-center gap-1.5 py-1">
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={() => hasChildren && setOpen(!open)}
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="inline-block w-3.5" />
          )}
        </button>
        <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="text-sm text-gray-700">{unit.name}</span>
        {unit.memberCount !== undefined && unit.memberCount > 0 && (
          <span className="text-xs text-gray-400">({unit.memberCount}명)</span>
        )}
        <div className="ml-1 hidden items-center gap-0.5 group-hover:flex">
          <ActionBtn
            onClick={() => setModal("add-child")}
            label="하위 추가"
            icon={<Plus className="h-3 w-3" />}
          />
          <ActionBtn
            onClick={() => setModal("edit")}
            label="수정"
            icon={<Pencil className="h-3 w-3" />}
          />
          <ActionBtn
            onClick={() => setModal("delete")}
            label="삭제"
            icon={<Trash2 className="h-3 w-3" />}
            danger
          />
        </div>
      </div>

      {open && hasChildren && (
        <div>
          {unit.children!.map((child) => (
            <OrgUnitNode
              key={child.id}
              unit={child}
              companyId={companyId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {modal === "edit" && (
        <UnitModal
          title={`부서 수정 — ${unit.name}`}
          defaultName={unit.name}
          onClose={() => setModal(null)}
          onSubmit={async (name) => {
            const res = await fetch(`/api/org/units/${unit.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "수정 실패");
            }
            onRefresh();
          }}
        />
      )}

      {modal === "add-child" && (
        <UnitModal
          title={`하위 부서 추가 — ${unit.name}`}
          onClose={() => setModal(null)}
          onSubmit={async (name) => {
            const res = await fetch("/api/org/units", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                companyId,
                parentId: unit.id,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "추가 실패");
            }
            onRefresh();
          }}
        />
      )}

      {modal === "delete" && (
        <DeleteModal
          unit={unit}
          onClose={() => setModal(null)}
          onDeleted={onRefresh}
        />
      )}
    </div>
  );
}

// ── 회사 노드 ─────────────────────────────────────────────────────────────────
function CompanyNode({
  company,
  onRefresh,
}: {
  company: Company;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const tree = buildTree(company.orgs);

  return (
    <div className="mb-4 rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-2 p-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          )}
          <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="font-medium text-gray-900">{company.name}</span>
          <span className="ml-2 text-xs text-gray-400">
            {company.orgs.length}개 조직
          </span>
        </button>
        <button
          onClick={() => setShowAddUnit(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-3.5 w-3.5" />
          부서 추가
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2">
          {tree.length > 0 ? (
            tree.map((unit) => (
              <OrgUnitNode
                key={unit.id}
                unit={unit}
                companyId={company.id}
                onRefresh={onRefresh}
              />
            ))
          ) : (
            <p className="text-xs text-gray-400">등록된 조직이 없습니다.</p>
          )}
        </div>
      )}

      {showAddUnit && (
        <UnitModal
          title={`최상위 부서 추가 — ${company.name}`}
          onClose={() => setShowAddUnit(false)}
          onSubmit={async (name) => {
            const res = await fetch("/api/org/units", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                companyId: company.id,
                parentId: null,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "추가 실패");
            }
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function ActionBtn({
  onClick,
  label,
  icon,
  danger,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`rounded p-0.5 ${
        danger
          ? "text-red-400 hover:bg-red-50 hover:text-red-600"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      }`}
    >
      {icon}
    </button>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function OrgTree({ companies }: { companies: Company[] }) {
  const router = useRouter();
  function refresh() {
    router.refresh();
  }

  return (
    <div>
      {companies.map((c) => (
        <CompanyNode key={c.id} company={c} onRefresh={refresh} />
      ))}
    </div>
  );
}
