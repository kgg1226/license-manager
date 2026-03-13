"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Users,
  Network,
  Cloud,
  HardDrive,
  Globe,
  BarChart3,
  History,
  Settings,
  Upload,
  FileSignature,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  BookOpen,
  Bell,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  authRequired?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "",
    items: [
      { href: "/dashboard", label: "\uB300\uC2DC\uBCF4\uB4DC", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/hardware", label: "\uD558\uB4DC\uC6E8\uC5B4", icon: <HardDrive className="h-4 w-4" /> },
      { href: "/licenses", label: "\uB77C\uC774\uC120\uC2A4", icon: <FileText className="h-4 w-4" /> },
      { href: "/cloud", label: "\uD074\uB77C\uC6B0\uB4DC", icon: <Cloud className="h-4 w-4" /> },
      { href: "/domains", label: "\uB3C4\uBA54\uC778\u00b7SSL", icon: <Globe className="h-4 w-4" /> },
      { href: "/contracts", label: "\uC5C5\uCCB4 \uACC4\uC57D", icon: <FileSignature className="h-4 w-4" /> },
      { href: "/employees", label: "\uC870\uC9C1\uC6D0", icon: <Users className="h-4 w-4" /> },
      { href: "/org", label: "\uC870\uC9C1\uB3C4", icon: <Network className="h-4 w-4" /> },
      { href: "/reports", label: "\uBCF4\uACE0\uC11C", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/history", label: "\uC774\uB825", icon: <History className="h-4 w-4" /> },
    ],
  },
  {
    title: "\uC124\uC815",
    collapsible: true,
    items: [
      { href: "/settings/groups", label: "\uADF8\uB8F9 \uC124\uC815", icon: <Settings className="h-4 w-4" /> },
      { href: "/settings/notifications", label: "\uC54C\uB9BC \uC124\uC815", icon: <Bell className="h-4 w-4" /> },
      { href: "/settings/import", label: "\uB370\uC774\uD130 \uAC00\uC838\uC624\uAE30", icon: <Upload className="h-4 w-4" />, authRequired: true },
      { href: "/guide", label: "\uAD00\uB9AC\uC790 \uAC00\uC774\uB4DC", icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <Package className="h-5 w-5 text-blue-600" />
        <Link href="/dashboard" className="text-sm font-bold text-gray-900">
          Asset Manager
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const isCollapsed = group.collapsible && collapsedGroups[group.title];

          return (
            <div key={group.title || "main"} className={group.title ? "mt-6" : ""}>
              {group.title && (
                <button
                  onClick={() => group.collapsible && toggleGroup(group.title)}
                  className="mb-1 flex w-full items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
                >
                  {group.collapsible && (
                    isCollapsed
                      ? <ChevronRight className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                  )}
                  {group.title}
                </button>
              )}
              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive(item.href)
                            ? "bg-blue-50 font-medium text-blue-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-gray-200 bg-white pt-14 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md bg-white p-2 shadow-md md:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-60 bg-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3 rounded p-1 hover:bg-gray-100"
              aria-label="메뉴 닫기"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
