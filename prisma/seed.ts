import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("ADMIN_PASSWORD 환경변수를 설정하세요.");
    console.error("사용법: ADMIN_PASSWORD=yourpassword npx prisma db seed");
    process.exit(1);
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: { password: hash },
    create: { username, password: hash },
  });

  console.log(`사용자 '${user.username}' 시드 완료 (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
