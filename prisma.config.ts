import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma config 파일은 실행 위치가 달라질 수 있으므로 절대 경로로 .env 로딩
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
