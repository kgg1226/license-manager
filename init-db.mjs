// init-db.mjs — 컨테이너 시작 시 DB 초기 데이터 설정
// - User 테이블이 비어있으면 관리자 계정 생성
// - 데이터가 있으면 아무것도 하지 않음
// - Prisma v7 generated client는 .ts만 생성 → node로 직접 import 불가
//   → pg 드라이버를 직접 사용

import pg from "pg";
import bcrypt from "bcryptjs";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();

  const { rows } = await client.query('SELECT COUNT(*)::int AS cnt FROM "User"');
  const count = rows[0].cnt;

  if (count === 0) {
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const password = process.env.SEED_ADMIN_PASSWORD || "changeme123";
    const hash = await bcrypt.hash(password, 12);

    await client.query(
      'INSERT INTO "User" (username, password, role, "isActive", "mustChangePassword", "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [username, hash, "ADMIN", true, false]
    );

    console.log(`[init-db] 관리자 계정 '${username}' 생성 완료`);
  } else {
    console.log(`[init-db] 기존 사용자 ${count}명 확인 — 시드 스킵`);
  }
} catch (e) {
  console.log(`[init-db] 초기화 스킵: ${e.message}`);
} finally {
  await client.end();
}
