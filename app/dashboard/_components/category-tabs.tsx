"use client";

import { CATEGORY_LABELS, type AssetCategory } from "@/lib/dashboard-aggregator";
import { LayoutDashboard, Monitor, Cloud, HardDrive, Globe, FileText, MoreHorizontal } from "lucide-react";

const TABS: { key: AssetCategory | null; label: string; icon: React.ReactNode }[] = [
  { key: null, label: "전체", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "SOFTWARE", label: CATEGORY_LABELS.SOFTWARE, icon: <Monitor className="h-4 w-4" /> },
  { key: "CLOUD", label: CATEGORY_LABELS.CLOUD, icon: <Cloud className="h-4 w-4" /> },
  { key: "HARDWARE", label: CATEGORY_LABELS.HARDWARE, icon: <HardDrive className="h-4 w-4" /> },
  { key: "DOMAIN_SSL", label: CATEGORY_LABELS.DOMAIN_SSL, icon: <Globe className="h-4 w-4" /> },
  { key: "CONTRACT", label: CATEGORY_LABELS.CONTRACT, icon: <FileText className="h-4 w-4" /> },
  { key: "OTHER", label: CATEGORY_LABELS.OTHER, icon: <MoreHorizontal className="h-4 w-4" /> },
];

export default function CategoryTabs({
  selected,
  onChange,
}: {
  selected: AssetCategory | null;
  onChange: (type: AssetCategory | null) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = selected === tab.key;
        return (
          <button
            key={tab.key ?? "all"}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
