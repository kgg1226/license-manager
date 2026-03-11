"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import OrgTree from "./org-tree";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

export default function OrgPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/org/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleRefresh = async () => {
    await fetchCompanies();
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error("회사명은 필수입니다.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/org/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "회사 생성에 실패했습니다.");
        return;
      }
      toast.success("회사가 생성되었습니다.");
      setShowCreateCompany(false);
      setNewCompanyName("");
      await fetchCompanies();
    } catch {
      toast.error("회사 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-center text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">조직도</h1>
          {user && (
            <button
              onClick={() => { setShowCreateCompany(true); setNewCompanyName(""); }}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              새 회사 생성
            </button>
          )}
        </div>

        {/* 회사 생성 모달 */}
        {showCreateCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">새 회사 생성</h3>
              <div className="mb-4">
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">회사명</label>
                <input
                  autoFocus
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="예: (주)트리플콤마"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCompany();
                    if (e.key === "Escape") setShowCreateCompany(false);
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateCompany(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >취소</button>
                <button
                  onClick={handleCreateCompany}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >{creating ? "생성 중..." : "생성"}</button>
              </div>
            </div>
          </div>
        )}

        {companies.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">등록된 조직이 없습니다.</p>
          </div>
        ) : (
          <OrgTree companies={companies} onRefresh={handleRefresh} isAuthenticated={!!user} />
        )}
      </div>
    </div>
  );
}
