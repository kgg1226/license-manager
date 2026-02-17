import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Providers from "./providers";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] bg-gray-50 text-gray-900 antialiased`}
      >
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/licenses" className="text-sm font-bold text-gray-900">
              License Manager
            </Link>
            <div className="flex gap-4">
              <Link href="/licenses" className="text-sm text-gray-600 hover:text-gray-900">
                라이선스
              </Link>
              <Link href="/employees" className="text-sm text-gray-600 hover:text-gray-900">
                조직원
              </Link>
              <Link href="/settings/groups" className="text-sm text-gray-600 hover:text-gray-900">
                그룹 설정
              </Link>
            </div>
          </div>
        </nav>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
