import "dotenv/config";
import { defineConfig } from "prisma/config";

// env() 헬퍼는 변수 미존재 시 에러를 던짐 → Docker 빌드(prisma generate)에서 실패
// process.env 직접 참조로 빌드 시 안전하게 빈 문자열 허용
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
