# 포스트모템 — DB / Prisma

> 마이그레이션 실패, 스키마 불일치, SQLite 관련, 쿼리 에러 등

---

## PM-DB-001: 컨테이너 내부에서 prisma db push 실패

- **상태**: ✅ 해결
- **날짜**: (최초 발생일)
- **세션**: 백엔드

### 증상
컨테이너 안에서 `npx prisma db push` 실행 시 `dotenv` 모듈 에러 발생.

### 원인
`dotenv`가 `devDependencies`에 있어서 프로덕션 이미지(`NODE_ENV=production`)에 포함되지 않음.

### 해결
DB 스키마 변경은 호스트에서 `sqlite3`로 직접 `ALTER TABLE` / `CREATE TABLE` 실행.

### 예방
- **절대 규칙**: 프로덕션 컨테이너에서 prisma CLI를 실행하지 말 것
- 스키마 변경 시 → `tasks/postmortem/db.md` 참조 → 호스트에서 직접 SQL 실행
- 변경할 SQL은 `tasks/db-changes.md`에 미리 작성 후 실행

### 관련 파일
- `prisma/schema.prisma`
- `dockerfile` (devDependencies 제외 설정)

---

## PM-DB-002: DB 테이블 없음 에러

- **상태**: ✅ 해결
- **날짜**: (최초 발생일)
- **세션**: 백엔드

### 증상
앱 시작 후 API 호출 시 `no such table: User` 에러.

### 원인
새 DB 파일에 스키마가 적용되지 않은 상태에서 컨테이너를 실행함.

### 해결
`references/init.sql`로 수동 스키마 적용:
```bash
sqlite3 $DB_HOST_PATH < init.sql  # DB_HOST_PATH는 .env.infra 참조
```

### 예방
- DB 초기화 체크리스트: ① 파일 존재 확인 → ② `.tables`로 테이블 확인 → ③ 없으면 init.sql 적용
- 컨테이너 시작 전 반드시 DB 상태 확인

### 관련 파일
- `references/init.sql`
- `prisma/schema.prisma`

---

## PM-DB-003: (템플릿)

- **상태**: ✅ 해결 / 🔧 미해결
- **날짜**: YYYY-MM-DD
- **세션**: 기획 / 프론트 / 백엔드

### 증상


### 원인


### 해결


### 예방


### 관련 파일

