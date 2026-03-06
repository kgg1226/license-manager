// [2026-03-05] SQLite better-sqlite3 어댑터 제거 → 표준 PrismaClient (DATABASE_URL 자동 참조)

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
