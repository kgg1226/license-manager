"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, HardDrive, Users, Cloud, Globe, FileSignature, Package } from "lucide-react";

interface SearchResult {
  licenses: { id: number; name: string; licenseType: string; expiryDate: string | null }[];
  assets: { id: number; name: string; type: string; status: string }[];
  employees: { id: number; name: string; department: string | null; email: string | null; status: string }[];
}

const ASSET_TYPE_META: Record<string, { label: string; icon: React.ReactNode; path: string }> = {
  HARDWARE: { label: "하드웨어", icon: <HardDrive className="h-3.5 w-3.5" />, path: "/hardware" },
  CLOUD: { label: "클라우드", icon: <Cloud className="h-3.5 w-3.5" />, path: "/cloud" },
  DOMAIN_SSL: { label: "도메인", icon: <Globe className="h-3.5 w-3.5" />, path: "/domains" },
  CONTRACT: { label: "계약", icon: <FileSignature className="h-3.5 w-3.5" />, path: "/contracts" },
  SOFTWARE: { label: "소프트웨어", icon: <Package className="h-3.5 w-3.5" />, path: "/hardware" },
  OTHER: { label: "기타", icon: <Package className="h-3.5 w-3.5" />, path: "/hardware" },
};

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data: SearchResult = await res.json();
        setResults(data);
        const hasResults = data.licenses.length > 0 || data.assets.length > 0 || data.employees.length > 0;
        setOpen(hasResults || q.length > 0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(path);
  };

  const totalCount = results
    ? results.licenses.length + results.assets.length + results.employees.length
    : 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results && query) setOpen(true); }}
          placeholder="통합 검색..."
          className="w-48 rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 lg:w-64"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}
      </div>

      {open && results && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg lg:w-96">
          {totalCount === 0 ? (
            <p className="px-4 py-3 text-center text-sm text-gray-500">검색 결과가 없습니다</p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {/* Licenses */}
              {results.licenses.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">라이선스</p>
                  {results.licenses.map((l) => (
                    <button
                      key={`l-${l.id}`}
                      onClick={() => navigate(`/licenses/${l.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{l.name}</p>
                        <p className="truncate text-xs text-gray-500">{l.licenseType}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Assets */}
              {results.assets.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">자산</p>
                  {results.assets.map((a) => {
                    const meta = ASSET_TYPE_META[a.type] ?? ASSET_TYPE_META.OTHER;
                    return (
                      <button
                        key={`a-${a.id}`}
                        onClick={() => navigate(`${meta.path}/${a.id}`)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="shrink-0 text-green-500">{meta.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{a.name}</p>
                          <p className="truncate text-xs text-gray-500">{meta.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Employees */}
              {results.employees.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">조직원</p>
                  {results.employees.map((e) => (
                    <button
                      key={`e-${e.id}`}
                      onClick={() => navigate(`/employees/${e.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <Users className="h-4 w-4 shrink-0 text-purple-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{e.name}</p>
                        <p className="truncate text-xs text-gray-500">{e.department || e.email || "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
