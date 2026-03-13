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
  // ── 자산 분류 체계 초기 데이터 ──
  const { rows: catRows } = await client.query(
    'SELECT COUNT(*)::int AS cnt FROM "AssetMajorCategory"'
  );
  if (catRows[0].cnt === 0) {
    // 대분류 삽입
    const majors = [
      { name: "클라우드",         code: "CL",  abbr: "CLoud",           desc: "EC2 인스턴스 접속 그룹 관리를 위한 VPC",                   sort: 1 },
      { name: "서버",             code: "SVR", abbr: "SerVeR",          desc: "대내외 서비스를 위해 사용되고 있는 서버장비",               sort: 2 },
      { name: "공개 IP",          code: "IP",  abbr: "IP",              desc: "서비스에 배정되어 사용중인 Public IP",                      sort: 3 },
      { name: "데이터베이스",     code: "DB",  abbr: "DataBase",        desc: "업무수행 목적으로 운영되고 있는 데이터베이스",              sort: 4 },
      { name: "웹,와스",          code: "WEB", abbr: "WEB/WAS",         desc: "업무수행 목적으로 운영되고 있는 WEB/WAS 서버",             sort: 5 },
      { name: "정보보안시스템",   code: "SC",  abbr: "SeCure solution", desc: "정보시스템을 외부로 부터 보호하는 방화벽, IPS, UTM 등 보안시스템", sort: 6 },
      { name: "애플리케이션",     code: "AP",  abbr: "APplication",     desc: "고객에게 서비스하고 있는 웹 및 모바일 APP",                sort: 7 },
      { name: "문서",             code: "TC",  abbr: "Triple Comma",    desc: "각종 정책/지침, 계약서류, 보고자료, 매뉴얼 등 문서",       sort: 8 },
      { name: "소프트웨어",       code: "SF",  abbr: "SoFtware",        desc: "그래픽 프로그램, 문서편집, 백신, 시스템복구 프로그램, 일반업무용(OS, Office), 개발용 등 소프트웨어", sort: 9 },
      { name: "단말기",           code: "PD",  abbr: "Personal Device", desc: "PC, 노트북, 이동형 단말기",                                sort: 10 },
      { name: "일반 공용장비",    code: "GD",  abbr: "Triple Comma",    desc: "일반 공용장비",                                            sort: 11 },
    ];

    for (const m of majors) {
      await client.query(
        `INSERT INTO "AssetMajorCategory" (name, code, abbr, description, "sortOrder", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [m.name, m.code, m.abbr, m.desc, m.sort]
      );
    }

    // 대분류 ID 조회
    const { rows: majorRows } = await client.query(
      'SELECT id, code FROM "AssetMajorCategory" ORDER BY "sortOrder"'
    );
    const majorMap = Object.fromEntries(majorRows.map((r) => [r.code, r.id]));

    // 소분류 삽입 (isIsmsTarget / isConsultingTarget 은 이미지 기준)
    const subs = [
      // 클라우드 (CL)
      { major: "CL", name: "VPC",              code: "VPC", isms: true,  consult: true,  sort: 1 },
      { major: "CL", name: "Security Group",   code: "SG",  isms: true,  consult: true,  sort: 2 },
      { major: "CL", name: "S3 Bucket",        code: "S3",  isms: true,  consult: true,  sort: 3 },
      { major: "CL", name: "Load Balancer",    code: "LB",  isms: true,  consult: true,  sort: 4 },
      // 서버 (SVR)
      { major: "SVR", name: "Linux",           code: "LI",  isms: true,  consult: true,  sort: 1 },
      // 공개 IP (IP)
      { major: "IP", name: "IP",               code: "IP",  isms: true,  consult: false, sort: 1 },
      // 데이터베이스 (DB)
      { major: "DB", name: "MYSQL",            code: "MY",  isms: true,  consult: true,  sort: 1 },
      // 웹,와스 (WEB)
      { major: "WEB", name: "WEB",             code: "WEB_S", isms: true,  consult: true,  sort: 1 },
      { major: "WEB", name: "TomCat",          code: "TC",    isms: true,  consult: true,  sort: 2 },
      // 정보보안시스템 (SC)
      { major: "SC", name: "SoFtware",         code: "SF_SC", isms: true,  consult: true,  sort: 1 },
      { major: "SC", name: "UTM",              code: "UT",    isms: true,  consult: true,  sort: 2 },
      // 애플리케이션 (AP)
      { major: "AP", name: "Web Application",  code: "WB",  isms: true,  consult: true,  sort: 1 },
      { major: "AP", name: "BT",               code: "BT",  isms: true,  consult: false, sort: 2 },
      { major: "AP", name: "ANdorid",          code: "AN",  isms: true,  consult: true,  sort: 3 },
      { major: "AP", name: "IOs",              code: "IO",  isms: true,  consult: true,  sort: 4 },
      // 문서 (TC)
      { major: "TC", name: "DOcument",         code: "DO",  isms: true,  consult: false, sort: 1 },
      // 소프트웨어 (SF)
      { major: "SF", name: "SoFtware",         code: "SF",  isms: true,  consult: false, sort: 1 },
      // 단말기 (PD)
      { major: "PD", name: "LapTop",           code: "LT",  isms: true,  consult: true,  sort: 1 },
      { major: "PD", name: "SmartPhone",       code: "SP",  isms: true,  consult: false, sort: 2 },
      // 일반 공용장비 (GD)
      { major: "GD", name: "Operate Equipment", code: "OE", isms: true,  consult: true,  sort: 1 },
    ];

    for (const s of subs) {
      await client.query(
        `INSERT INTO "AssetSubCategory" ("majorCategoryId", name, code, "isIsmsTarget", "isConsultingTarget", "sortOrder", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
        [majorMap[s.major], s.name, s.code, s.isms, s.consult, s.sort]
      );
    }

    console.log(`[init-db] 자산 분류 체계 시드 완료 (대분류 ${majors.length}개, 소분류 ${subs.length}개)`);
  } else {
    console.log(`[init-db] 기존 자산 분류 ${catRows[0].cnt}개 확인 — 시드 스킵`);
  }

} catch (e) {
  console.log(`[init-db] 초기화 스킵: ${e.message}`);
} finally {
  await client.end();
}
