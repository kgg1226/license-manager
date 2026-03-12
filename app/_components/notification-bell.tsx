"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, FileText, HardDrive, Cloud, Globe, FileSignature, Package, AlertTriangle } from "lucide-react";

interface ExpiringItem {
  id: number;
  name: string;
  type: string;
  expiryDate: string;
  daysLeft: number;
  source: "license" | "asset";
}

const ASSET_TYPE_META: Record<string, { icon: React.ReactNode; path: string }> = {
  HARDWARE: { icon: <HardDrive className="h-4 w-4" />, path: "/hardware" },
  CLOUD: { icon: <Cloud className="h-4 w-4" />, path: "/cloud" },
  DOMAIN_SSL: { icon: <Globe className="h-4 w-4" />, path: "/domains" },
  CONTRACT: { icon: <FileSignature className="h-4 w-4" />, path: "/contracts" },
  SOFTWARE: { icon: <Package className="h-4 w-4" />, path: "/hardware" },
  OTHER: { icon: <Package className="h-4 w-4" />, path: "/hardware" },
};

function getBadgeColor(days: number): string {
  if (days <= 7) return "bg-red-100 text-red-700";
  if (days <= 30) return "bg-orange-100 text-orange-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Fetch expiring assets (90 days) and licenses
      const [assetsRes, licensesRes] = await Promise.all([
        fetch("/api/assets/expiring?days=90"),
        fetch("/api/licenses?limit=200"),
      ]);

      const result: ExpiringItem[] = [];

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        const assets = assetsData.assets ?? assetsData ?? [];
        for (const a of assets) {
          if (a.expiryDate) {
            const daysLeft = Math.ceil((new Date(a.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft >= 0 && daysLeft <= 90) {
              result.push({ id: a.id, name: a.name, type: a.type, expiryDate: a.expiryDate, daysLeft, source: "asset" });
            }
          }
        }
      }

      if (licensesRes.ok) {
        const licensesData = await licensesRes.json();
        const licenses = licensesData.data ?? licensesData ?? [];
        for (const l of licenses) {
          if (l.expiryDate) {
            const daysLeft = Math.ceil((new Date(l.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft >= 0 && daysLeft <= 90) {
              result.push({ id: l.id, name: l.name, type: "LICENSE", expiryDate: l.expiryDate, daysLeft, source: "license" });
            }
          }
        }
      }

      result.sort((a, b) => a.daysLeft - b.daysLeft);
      setItems(result);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const handleOpen = () => {
    if (!open) fetchNotifications();
    setOpen(!open);
  };

  const navigate = (item: ExpiringItem) => {
    setOpen(false);
    if (item.source === "license") {
      router.push(`/licenses/${item.id}`);
    } else {
      const meta = ASSET_TYPE_META[item.type] ?? ASSET_TYPE_META.OTHER;
      router.push(`${meta.path}/${item.id}`);
    }
  };

  const urgentCount = items.filter((i) => i.daysLeft <= 30).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="알림"
      >
        <Bell className="h-5 w-5" />
        {urgentCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {urgentCount > 99 ? "99+" : urgentCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg lg:w-96">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">만료 알림</h3>
            <span className="text-xs text-gray-500">{items.length}건</span>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">로딩 중...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">90일 내 만료 예정 항목이 없습니다</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {items.map((item) => {
                const icon = item.source === "license"
                  ? <FileText className="h-4 w-4 text-blue-500" />
                  : (ASSET_TYPE_META[item.type]?.icon ?? <Package className="h-4 w-4 text-gray-500" />);
                return (
                  <button
                    key={`${item.source}-${item.id}`}
                    onClick={() => navigate(item)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                  >
                    <span className="mt-0.5 shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${getBadgeColor(item.daysLeft)}`}>
                          <AlertTriangle className="h-3 w-3" />
                          {item.daysLeft === 0 ? "오늘 만료" : `D-${item.daysLeft}`}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.expiryDate).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
