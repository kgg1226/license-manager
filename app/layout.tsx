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
  const user = await getCurrentUser();

  // 세션 쿠키는 있지만 DB 세션이 만료/삭제된 경우 로그인으로 리다이렉트
  if (!user && pathname !== "/login") {
    redirect("/login");
  }

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] bg-gray-50 text-gray-900 antialiased`}
      >
        {user && (
          <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
              <Link href="/licenses" className="text-sm font-bold text-gray-900">
                License Manager
              </Link>
              <div className="flex flex-1 gap-4">
                <Link href="/licenses" className="text-sm text-gray-600 hover:text-gray-900">
                  라이선스
                </Link>
                <Link href="/employees" className="text-sm text-gray-600 hover:text-gray-900">
                  조직원
                </Link>
                <Link href="/settings/groups" className="text-sm text-gray-600 hover:text-gray-900">
                  그룹 설정
                </Link>
                <Link href="/settings/import" className="text-sm text-gray-600 hover:text-gray-900">
                  데이터 가져오기
                </Link>
                <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900">
                  이력
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="text-sm text-purple-600 hover:text-purple-800">
                    관리자
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <span className="text-xs text-gray-400">{user.username}</span>
                <LogoutButton />
              </div>
            </div>
          </nav>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
