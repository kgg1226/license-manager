import { defineConfig } from "prisma/config";

// Docker 환경: DATABASE_URL은 docker-compose의 environment 블록에서 주입됨
// 로컬 개발: .env 파일은 Prisma CLI가 schema.prisma의 env() 함수로 자동 로딩
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
