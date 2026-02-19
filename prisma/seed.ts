import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

// ── 프로덕션 안전장치 ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  console.error("❌  seed는 프로덕션 환경에서 실행할 수 없습니다. (NODE_ENV=production)");
  process.exit(1);
}

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const email    = process.env.SEED_ADMIN_EMAIL   || undefined;
  const name     = process.env.SEED_ADMIN_NAME    || undefined;

  if (!username || !password) {
    console.error(
      "❌  SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD 환경변수가 필요합니다.\n" +
      "   .env 파일에 아래 항목을 추가하세요:\n\n" +
      "   SEED_ADMIN_USERNAME=admin\n" +
      "   SEED_ADMIN_PASSWORD=changeme123\n" +
      "   SEED_ADMIN_EMAIL=admin@example.com\n" +
      "   SEED_ADMIN_NAME=관리자\n"
    );
    process.exit(1);
  }

  if (password.length < 4) {
    console.error("❌  SEED_ADMIN_PASSWORD는 4자 이상이어야 합니다.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where:  { username },
    update: {
      password: hash,
      role:     "ADMIN",
      isActive: true,
      ...(email !== undefined && { email }),
      ...(name  !== undefined && { name  }),
    },
    create: {
      username,
      password: hash,
      role:     "ADMIN",
      isActive: true,
      ...(email !== undefined && { email }),
      ...(name  !== undefined && { name  }),
    },
  });

  console.log(
    `✓ 관리자 계정 '${user.username}' (id: ${user.id}) 시드 완료` +
    (user.email ? ` — ${user.email}` : "")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
