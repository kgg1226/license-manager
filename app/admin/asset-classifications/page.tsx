"use client";

// 자산 분류 체계 관리 페이지 — 대분류 + 소분류 트리 CRUD

import { useState, useEffect, useCallback } from "react";
import {
  Layers, Plus, Pencil, Trash2, Check, X,
  ChevronDown, ChevronRight, Shield, FileSearch,
} from "lucide-react";

type SubCategory = {
  id: number;
  majorCategoryId: number;
  name: string;
  code: string;
  isIsmsTarget: boolean;
  isConsultingTarget: boolean;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { assets: number };
};

type MajorCategory = {
  id: number;
  name: string;
  code: string;
  abbr: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  subCategories: SubCategory[];
};

type MajorForm = { name: string; code: string; abbr: string; description: string };
type SubForm = {
  name: string; code: string; description: string;
  isIsmsTarget: boolean; isConsultingTarget: boolean;
};

const EMPTY_MAJOR: MajorForm = { name: "", code: "", abbr: "", description: "" };
const EMPTY_SUB: SubForm = { name: "", code: "", description: "", isIsmsTarget: true, isConsultingTarget: false };

export default function AssetClassificationsPage() {
  const [categories, setCategories] = useState<MajorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 대분류 폼
  const [showMajorForm, setShowMajorForm] = useState(false);
  const [majorForm, setMajorForm] = useState<MajorForm>(EMPTY_MAJOR);
  const [editingMajorId, setEditingMajorId] = useState<number | null>(null);

  // 소분류 폼
  const [showSubForm, setShowSubForm] = useState<number | null>(null); // majorId
  const [subForm, setSubForm] = useState<SubForm>(EMPTY_SUB);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/asset-classifications");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        // 초기에 모든 대분류 펼침
        setExpanded(new Set(data.map((c: MajorCategory) => c.id)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── 대분류 CRUD ──
  function startMajorCreate() {
    setEditingMajorId(null);
    setMajorForm(EMPTY_MAJOR);
    setError(null);
    setShowMajorForm(true);
    setShowSubForm(null);
  }

  function startMajorEdit(cat: MajorCategory) {
    setEditingMajorId(cat.id);
    setMajorForm({ name: cat.name, code: cat.code, abbr: cat.abbr ?? "", description: cat.description ?? "" });
    setError(null);
    setShowMajorForm(true);
    setShowSubForm(null);
  }

  function cancelMajorForm() {
    setShowMajorForm(false);
    setEditingMajorId(null);
    setMajorForm(EMPTY_MAJOR);
    setError(null);
  }

  async function saveMajor() {
    setSaving(true);
    setError(null);
    try {
      const url = editingMajorId
        ? `/api/admin/asset-classifications/${editingMajorId}`
        : "/api/admin/asset-classifications";
      const res = await fetch(url, {
        method: editingMajorId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(majorForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      await load();
      cancelMajorForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMajor(cat: MajorCategory) {
    const totalAssets = cat.subCategories.reduce((sum, s) => sum + s._count.assets, 0);
    const msg = totalAssets > 0
      ? `"${cat.name}" 대분류와 하위 소분류 ${cat.subCategories.length}개를 삭제하시겠습니까?\n(연결된 자산 ${totalAssets}개가 있어 삭제 불가)`
      : `"${cat.name}" 대분류와 하위 소분류 ${cat.subCategories.length}개를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/admin/asset-classifications/${cat.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  // ── 소분류 CRUD ──
  function startSubCreate(majorId: number) {
    setShowSubForm(majorId);
    setEditingSubId(null);
    setSubForm(EMPTY_SUB);
    setError(null);
    setShowMajorForm(false);
    setExpanded((prev) => new Set(prev).add(majorId));
  }

  function startSubEdit(sub: SubCategory) {
    setShowSubForm(sub.majorCategoryId);
    setEditingSubId(sub.id);
    setSubForm({
      name: sub.name,
      code: sub.code,
      description: sub.description ?? "",
      isIsmsTarget: sub.isIsmsTarget,
      isConsultingTarget: sub.isConsultingTarget,
    });
    setError(null);
    setShowMajorForm(false);
  }

  function cancelSubForm() {
    setShowSubForm(null);
    setEditingSubId(null);
    setSubForm(EMPTY_SUB);
    setError(null);
  }

  async function saveSub() {
    if (!showSubForm) return;
    setSaving(true);
    setError(null);
    try {
      const url = editingSubId
        ? `/api/admin/asset-classifications/sub/${editingSubId}`
        : `/api/admin/asset-classifications/${showSubForm}/sub`;
      const res = await fetch(url, {
        method: editingSubId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      await load();
      cancelSubForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSub(sub: SubCategory) {
    if (!confirm(`"${sub.name}" 소분류를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/asset-classifications/sub/${sub.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  // ── 통계 ──
  const totalMajor = categories.length;
  const totalSub = categories.reduce((s, c) => s + c.subCategories.length, 0);
  const totalAssets = categories.reduce(
    (s, c) => s + c.subCategories.reduce((ss, sc) => ss + sc._count.assets, 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">자산 분류 체계</h1>
              <p className="text-sm text-gray-500">
                대분류 {totalMajor}개 · 소분류 {totalSub}개 · 연결된 자산 {totalAssets}건
              </p>
            </div>
          </div>
          {!showMajorForm && (
            <button
              onClick={startMajorCreate}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              대분류 추가
            </button>
          )}
        </div>

        {/* 대분류 생성/수정 폼 */}
        {showMajorForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingMajorId ? "대분류 수정" : "새 대분류 생성"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  대분류명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={majorForm.name}
                  onChange={(e) => setMajorForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="예: 클라우드"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  코드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={majorForm.code}
                  onChange={(e) => setMajorForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="예: CL" maxLength={10}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">약자</label>
                <input
                  type="text" value={majorForm.abbr}
                  onChange={(e) => setMajorForm((p) => ({ ...p, abbr: e.target.value }))}
                  placeholder="예: CLoud"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">설명</label>
                <input
                  type="text" value={majorForm.description}
                  onChange={(e) => setMajorForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="비고"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={saveMajor} disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                <Check className="h-4 w-4" />{saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={cancelMajorForm}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <X className="h-4 w-4" />취소
              </button>
            </div>
          </div>
        )}

        {/* 분류 트리 */}
        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-400 shadow-sm ring-1 ring-gray-200">
            로딩 중...
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-400 shadow-sm ring-1 ring-gray-200">
            등록된 분류가 없습니다. 대분류를 추가해주세요.
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const isExpanded = expanded.has(cat.id);
              const subAssets = cat.subCategories.reduce((s, sc) => s + sc._count.assets, 0);
              return (
                <div key={cat.id} className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
                  {/* 대분류 헤더 */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <button onClick={() => toggleExpand(cat.id)} className="text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 font-mono">
                          {cat.code}
                        </span>
                        <span className="font-semibold text-gray-900">{cat.name}</span>
                        {cat.abbr && <span className="text-xs text-gray-400">({cat.abbr})</span>}
                        <span className="text-xs text-gray-400 ml-2">
                          소분류 {cat.subCategories.length}개 · 자산 {subAssets}건
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startSubCreate(cat.id)}
                        className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                        title="소분류 추가">
                        <Plus className="h-3 w-3" />소분류
                      </button>
                      <button onClick={() => startMajorEdit(cat)} className="text-gray-400 hover:text-blue-500" title="수정">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMajor(cat)} className="text-gray-400 hover:text-red-500" title="삭제">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 소분류 목록 */}
                  {isExpanded && (
                    <div>
                      {/* 소분류 생성/수정 폼 */}
                      {showSubForm === cat.id && (
                        <div className="border-b border-gray-200 bg-indigo-50/30 px-6 py-4">
                          <h3 className="mb-3 text-sm font-semibold text-gray-700">
                            {editingSubId ? "소분류 수정" : `"${cat.name}" 소분류 추가`}
                          </h3>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                소분류명 <span className="text-red-500">*</span>
                              </label>
                              <input type="text" value={subForm.name}
                                onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="예: Security Group"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                코드 <span className="text-red-500">*</span>
                              </label>
                              <input type="text" value={subForm.code}
                                onChange={(e) => setSubForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                                placeholder="예: SG" maxLength={10}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">설명</label>
                              <input type="text" value={subForm.description}
                                onChange={(e) => setSubForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder="비고"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-6">
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={subForm.isIsmsTarget}
                                onChange={(e) => setSubForm((p) => ({ ...p, isIsmsTarget: e.target.checked }))}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              <Shield className="h-3.5 w-3.5 text-blue-500" />
                              ISMS-P 대상
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={subForm.isConsultingTarget}
                                onChange={(e) => setSubForm((p) => ({ ...p, isConsultingTarget: e.target.checked }))}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              <FileSearch className="h-3.5 w-3.5 text-orange-500" />
                              컨설팅 대상
                            </label>
                          </div>
                          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                          <div className="mt-3 flex gap-2">
                            <button onClick={saveSub} disabled={saving}
                              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                              <Check className="h-3.5 w-3.5" />{saving ? "저장 중..." : "저장"}
                            </button>
                            <button onClick={cancelSubForm}
                              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                              <X className="h-3.5 w-3.5" />취소
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 소분류 테이블 */}
                      {cat.subCategories.length === 0 ? (
                        <div className="px-6 py-4 text-center text-sm text-gray-400">
                          소분류가 없습니다.
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs font-medium uppercase text-gray-400 border-b border-gray-100">
                              <th className="px-6 py-2 text-left w-12"></th>
                              <th className="px-2 py-2 text-left">코드</th>
                              <th className="px-2 py-2 text-left">소분류명</th>
                              <th className="px-2 py-2 text-center">ISMS-P</th>
                              <th className="px-2 py-2 text-center">컨설팅</th>
                              <th className="px-2 py-2 text-center">자산 수</th>
                              <th className="px-2 py-2 text-right pr-4">관리</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {cat.subCategories.map((sub) => (
                              <tr key={sub.id} className="hover:bg-gray-50">
                                <td className="px-6 py-2 text-gray-300">└</td>
                                <td className="px-2 py-2">
                                  <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-medium text-gray-600">
                                    {sub.code}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-gray-900">
                                  {sub.name}
                                  {sub.description && (
                                    <span className="ml-2 text-xs text-gray-400">{sub.description}</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {sub.isIsmsTarget ? (
                                    <Shield className="inline h-4 w-4 text-blue-500" />
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {sub.isConsultingTarget ? (
                                    <FileSearch className="inline h-4 w-4 text-orange-500" />
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-center text-gray-500">{sub._count.assets}</td>
                                <td className="px-2 py-2 text-right pr-4">
                                  <div className="inline-flex gap-2">
                                    <button onClick={() => startSubEdit(sub)} className="text-gray-400 hover:text-blue-500" title="수정">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => deleteSub(sub)} className="text-gray-400 hover:text-red-500" title="삭제"
                                      disabled={sub._count.assets > 0}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 안내 */}
        <div className="mt-4 rounded-lg bg-indigo-50 p-4 ring-1 ring-indigo-200">
          <p className="text-sm text-indigo-700">
            자산 분류 체계는 정보자산을 체계적으로 관리하기 위한 대분류-소분류 구조입니다.
            <br />
            소분류에 연결된 자산이 있으면 삭제할 수 없습니다. ISMS-P/컨설팅 대상 여부를 설정하여 보안 증적에 활용합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
