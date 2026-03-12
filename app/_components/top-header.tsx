"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  LogIn,
  Shield,
  Archive,
  DollarSign,
  Tags,
  ChevronDown,
} from "lucide-react";
import GlobalSearch from "./global-search";

interface TopHeaderProps {
  user: { username: string; role: string } | null;
}

export default function TopHeader({ user }: TopHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const adminItems = [
    { href: "/admin/users", label: "사용자 관리", icon: <Shield className="h-4 w-4" /> },
    { href: "/admin/archives", label: "증적", icon: <Archive className="h-4 w-4" /> },
    { href: "/admin/exchange-rates", label: "환율", icon: <DollarSign className="h-4 w-4" /> },
    { href: "/admin/asset-categories", label: "자산카테고리", icon: <Tags className="h-4 w-4" /> },
  ];

  return (
    <header className="fixed top-0 right-0 left-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:left-60">
      <div className="hidden sm:block">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3">
        {/* Admin Dropdown */}
        {user?.role === "ADMIN" && (
          <div ref={adminRef} className="relative">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <Shield className="h-4 w-4" />
              관리
              <ChevronDown className={`h-3 w-3 transition-transform ${adminOpen ? "rotate-180" : ""}`} />
            </button>
            {adminOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {adminItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAdminOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User / Login */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user.username}</span>
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${user.role === "ADMIN" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              {user.role === "ADMIN" ? "관리자" : "사용자"}
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="ml-1 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <LogIn className="h-4 w-4" />
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
