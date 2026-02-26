// 변경: DATABASE_URL 환경변수 반영, 프로덕션 포함 항상 싱글톤 적용

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ??
  path.join(process.cwd(), "dev.db");

const adapter = new PrismaBetterSqlite3({ url: dbUrl });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;
