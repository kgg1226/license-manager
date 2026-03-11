// 변경: DB 에러 시 전체 앱 장애 방지(catch), 조직도 메뉴 추가

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Providers from "./providers";
import LogoutButton from "./logout-button";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "License Manager",
  description: "License management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const user = await getCurrentUser().catch(() => null);

  // 비밀번호 변경 필수인 경우 비밀번호 변경 페이지로 리다이렉트
  // (change-password 페이지에서는 리다이렉트 방지)
  if (
    user &&
    user.mustChangePassword &&
    pathname !== "/change-password"
  ) {
    redirect("/change-password");
  }

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] bg-gray-50 text-gray-900 antialiased`}
      >
        {pathname !== "/login" && (
          <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
              <Link href="/licenses" className="text-sm font-bold text-gray-900">
                License Manager
              </Link>
              <div className="flex flex-1 gap-4">
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  대시보드
                </Link>
                <Link href="/licenses" className="text-sm text-gray-600 hover:text-gray-900">
                  라이선스
                </Link>
                <Link href="/employees" className="text-sm text-gray-600 hover:text-gray-900">
                  조직원
                </Link>
                <Link href="/org" className="text-sm text-gray-600 hover:text-gray-900">
                  조직도
                </Link>
                <Link href="/settings/groups" className="text-sm text-gray-600 hover:text-gray-900">
                  그룹 설정
                </Link>
                {user && (
                  <Link href="/settings/import" className="text-sm text-gray-600 hover:text-gray-900">
                    데이터 가져오기
                  </Link>
                )}
                <Link href="/assets" className="text-sm text-gray-600 hover:text-gray-900">
                  자산
                </Link>
                <Link href="/reports" className="text-sm text-gray-600 hover:text-gray-900">
                  보고서
                </Link>
                <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900">
                  이력
                </Link>
                {user?.role === "ADMIN" && (
                  <>
                    <Link href="/admin/users" className="text-sm text-purple-600 hover:text-purple-800">
                      사용자 관리
                    </Link>
                    <Link href="/admin/archives" className="text-sm text-purple-600 hover:text-purple-800">
                      증적
                    </Link>
                    <Link href="/admin/exchange-rates" className="text-sm text-purple-600 hover:text-purple-800">
                      환율
                    </Link>
                    <Link href="/admin/asset-categories" className="text-sm text-purple-600 hover:text-purple-800">
                      자산카테고리
                    </Link>
                  </>
                )}
              </div>
              {user ? (
                <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                  <span className="text-xs text-gray-400">{user.username}</span>
                  <LogoutButton />
                </div>
              ) : (
                <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  로그인
                </Link>
              )}
            </div>
          </nav>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
