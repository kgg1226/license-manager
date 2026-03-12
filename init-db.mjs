// init-db.mjs — 컨테이너 시작 시 DB 초기 데이터 설정
// - User 테이블이 비어있으면 관리자 계정 생성
// - 데이터가 있으면 아무것도 하지 않음

const { PrismaClient } = await import("./generated/prisma/client.js");
const { PrismaPg } = await import("@prisma/adapter-pg");
const bcrypt = await import("bcryptjs");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

try {
  const count = await prisma.user.count();

  if (count === 0) {
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const password = process.env.SEED_ADMIN_PASSWORD || "changeme123";
    const hash = await bcrypt.default.hash(password, 12);

    await prisma.user.create({
      data: { username, password: hash, role: "ADMIN", isActive: true },
    });

    console.log(`[init-db] 관리자 계정 '${username}' 생성 완료`);
  } else {
    console.log(`[init-db] 기존 사용자 ${count}명 확인 — 시드 스킵`);
  }
} catch (e) {
  // 테이블이 아직 없거나 연결 실패 시 — 앱 시작은 계속 진행
  console.log(`[init-db] 초기화 스킵: ${e.message}`);
} finally {
  await prisma.$disconnect();
}
