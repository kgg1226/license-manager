// 상단 헤더 바 + 왼쪽 사이드바 레이아웃

import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Providers from "./providers";
import Sidebar from "./sidebar";
import TopHeader from "./_components/top-header";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = localFont({
  src: "../public/fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Asset Manager",
  description: "Asset management system",
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
  if (
    user &&
    user.mustChangePassword &&
    pathname !== "/change-password"
  ) {
    redirect("/change-password");
  }

  const showSidebar = pathname !== "/login";
  const userProp = user ? { username: user.username, role: user.role } : null;

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] bg-gray-50 text-gray-900 antialiased`}
      >
        {showSidebar && (
          <>
            <TopHeader user={userProp} />
            <Sidebar />
          </>
        )}
        <main className={showSidebar ? "md:ml-60 pt-14" : ""}>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
