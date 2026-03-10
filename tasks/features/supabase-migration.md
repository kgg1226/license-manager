# 기능: Supabase(PostgreSQL) 전환

> **목표**: SQLite → Supabase PostgreSQL로 DB 마이그레이션
> **우선순위**: 🔴 **Phase 1 (배포 블로커)**
> **상태**: ⏳ 진행 대기
> **최종 업데이트**: 2026-03-06

---

## 1. 개요

### 현재 상태
- **DB**: SQLite (로컬 파일 기반)
- **Prisma Adapter**: `@prisma/adapter-better-sqlite3`
- **문제점**:
  - 로컬 파일 기반이라 EC2 배포 시 데이터 영속성 어려움
  - 동시 사용자 제한
  - 확장성 부족

### 목표 상태
- **DB**: Supabase (PostgreSQL 관리형 서비스)
- **Prisma Adapter**: 표준 PostgreSQL 드라이버 (내장)
- **장점**:
  - 관리형 서비스 (백업, 복제 자동)
  - 높은 가용성
  - 무제한 동시 연결
  - EC2 배포에 최적화

### 범위
- ✅ 포함: Prisma 스키마 변경, 의존성 제거, Supabase 연동
- ❌ 제외: 데이터 마이그레이션 (초기 빈 DB에서 시작)
- ❌ 제외: UI/UX 변경

---

## 2. 작업 분담

### 백엔드 (`role/backend`)

#### [BE-010] Prisma 스키마 변경

**파일**: `prisma/schema.prisma`

**변경 내용**:

```prisma
// 변경 전
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 변경 후
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**추가 수정 사항**:

1. **Enum 네이티브화** (String → 네이티브 enum)
   ```prisma
   // 변경 전
   enum MemberStatus {
     ACTIVE
     OFFBOARDING
     DELETED
   }

   // → @db.Text 어노테이션이 있던 필드
   status String @default("ACTIVE") @db.Text

   // 변경 후
   enum MemberStatus {
     ACTIVE
     OFFBOARDING
     DELETED
   }

   status MemberStatus @default(ACTIVE)  // @db.Text 제거
   ```

   **대상 enum들**:
   - `Role` (ADMIN, USER)
   - `LicenseType` (KEY_BASED, VOLUME, NO_KEY)
   - `MemberStatus` (ACTIVE, OFFBOARDING, DELETED)
   - `RenewalStatus` (BEFORE_RENEWAL, IN_PROGRESS, NOT_RENEWING, RENEWED)

2. **자동증가 ID 확인** (유지)
   - SQLite의 `@default(autoincrement())`는 PostgreSQL SERIAL과 호환
   - 변경 불필요

3. **SQLite 특화 기능 제거**
   - 전체 모델 검토하여 PostgreSQL 비호환 요소 확인
   - 예: `@db.Text` 어노테이션, SQLite 특화 타입 등

**체크리스트**:
- [ ] datasource provider 변경
- [ ] 모든 enum 필드에서 `@db.Text` 제거
- [ ] autoincrement() 유지 여부 확인
- [ ] 전체 스키마 검토 및 PostgreSQL 호환성 확인
- [ ] `prisma format` 실행

---

#### [BE-011] Prisma 클라이언트 설정 변경

**파일**: `lib/prisma.ts`

**변경 전**:
```typescript
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const adapter = new PrismaBetterSqlite3(
  fs.existsSync(process.env.DATABASE_URL?.replace("file:", "") || "")
    ? process.env.DATABASE_URL
    : "file:./dev.db"
);

const prisma = new PrismaClient({ adapter });
```

**변경 후**:
```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// NOTE: DATABASE_URL 환경변수에서 자동으로 PostgreSQL 연결
// 예: postgresql://user:password@host:port/dbname
```

**제거 사항**:
- `@prisma/adapter-better-sqlite3` import 제거
- `PrismaBetterSqlite3` 인스턴스 제거
- `fs` import 제거
- `file:` prefix 파싱 로직 제거

**설정**:
- `DATABASE_URL` 환경변수로 PostgreSQL 연결 정보 제공
- Supabase에서 제공하는 연결 URL 사용

**체크리스트**:
- [ ] `lib/prisma.ts` 리팩토링
- [ ] 로컬 테스트 (Supabase 로컬 또는 프로덕션 DB 사용)
- [ ] Prisma Studio 정상 작동 확인

---

#### [BE-012] 패키지 의존성 제거

**파일**: `package.json`

**제거할 패키지**:
1. `better-sqlite3` (SQLite 드라이버)
2. `@prisma/adapter-better-sqlite3` (Prisma SQLite 어댑터)
3. `@types/better-sqlite3` (타입 정의)

**명령어**:
```bash
npm uninstall better-sqlite3 @prisma/adapter-better-sqlite3 @types/better-sqlite3
npm install
prisma generate
```

**검증**:
- [ ] 패키지 제거 완료
- [ ] `npm install` 성공
- [ ] `prisma generate` 성공
- [ ] 빌드 성공 (`npm run build`)

**예상 용량 감소**:
- better-sqlite3: ~5MB (바이너리 포함)
- 어댑터/타입: ~1MB
- **총 ~6MB 감소**

---

#### [BE-013] Supabase 마이그레이션 초기화

**선행 조건**:
- Supabase 프로젝트 생성 (https://supabase.com)
- 프로젝트에서 PostgreSQL 데이터베이스 생성
- 연결 URL 확인 (Supabase Dashboard → Settings → Database)

**단계**:

**1단계: 로컬 환경변수 설정**

`.env.local` 또는 `.env` 파일:
```
DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"
```

**2단계: Prisma 마이그레이션 생성 및 적용**

**옵션 A: `prisma migrate dev` (권장)**
```bash
prisma migrate dev --name init
# → 마이그레이션 파일 생성 + DB에 적용
```

**옵션 B: `prisma db push` (개발 중)**
```bash
prisma db push
# → 스키마를 직접 DB에 푸시 (마이그레이션 파일 없음)
```

**3단계: 검증**

```bash
# Prisma Studio 실행 (웹 UI)
npx prisma studio

# 또는 Supabase Dashboard → SQL Editor에서 테이블 확인
```

**체크리스트**:
- [ ] Supabase 프로젝트 생성
- [ ] PostgreSQL DB 연결 URL 확인
- [ ] `.env.local` 설정 (DATABASE_URL)
- [ ] Prisma 마이그레이션 실행
- [ ] 테이블 생성 확인 (Supabase Dashboard)
- [ ] Prisma Studio에서 테이블 조회 테스트

**주의사항**:
- `tasks/db-changes.md`의 `[2026-03-04]` 항목(OrgUnit, Employee 등)은 **무시**
  - 스키마 전체가 Supabase에서 새로 생성되므로 불필요
- 마이그레이션 완료 후 `tasks/db-changes.md` 아카이브 처리

---

### DevOps (`role/devops`)

#### [OPS-010] 배포 스크립트 및 Docker 설정 변경

**파일**: `deploy.sh`, `docker-compose.yml`, `dockerfile`

**변경 내용**:

**docker-compose.yml**:
```yaml
# 변경 전
services:
  app:
    # ...
    environment:
      DATABASE_URL: "file:/app/dev.db"
    volumes:
      - /home/ssm-user/app/data/dev.db:/app/dev.db

# 변경 후
services:
  app:
    # ...
    environment:
      DATABASE_URL: "${DATABASE_URL}"  # 환경변수에서 주입
      # (SQLite 볼륨 제거)
```

**deploy.sh / deploy.ps1**:
```bash
# 변경 전
docker run \
  -e DATABASE_URL="file:/app/dev.db" \
  -v /home/ssm-user/app/dev.db:/app/dev.db \
  ...

# 변경 후
# EC2 SSM Parameter Store에서 DATABASE_URL 읽어오기
DATABASE_URL=$(aws ssm get-parameter \
  --name /license-manager/database-url \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

docker run \
  -e DATABASE_URL="$DATABASE_URL" \
  ... # (볼륨 제거)
```

**변경 사항 요약**:

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 볼륨 마운트 | `-v /home/.../dev.db:/app/dev.db` | (제거) |
| DATABASE_URL | `file:/app/dev.db` | EC2 SSM Parameter Store |
| 환경변수 주입 | 하드코딩 | `-e DATABASE_URL="$..."`  |

**체크리스트**:
- [ ] `docker-compose.yml` 업데이트
- [ ] `deploy.sh` / `deploy.ps1` 업데이트
- [ ] EC2 SSM Parameter Store에 DATABASE_URL 저장
- [ ] dockerfile 검토 (비root USER 설정 확인)

---

#### [OPS-011] 환경변수 문서화

**파일**: `.env.example`

**생성 내용**:
```bash
# 데이터베이스
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# 인증
SECURE_COOKIE=true

# 스케줄러 (cron 보호)
CRON_SECRET=your-secret-key

# Slack 알림 (옵션)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Email 알림 (옵션)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@company.com
SMTP_SECURE=false

# 기타
NODE_ENV=production
```

**체크리스트**:
- [ ] `.env.example` 작성
- [ ] Git에 커밋 (실제 값 없음)
- [ ] README.md에 환경변수 설정 가이드 추가

---

#### [OPS-001] Dockerfile 비root 사용자 추가 (보안)

**파일**: `dockerfile`

**추가 사항**:
```dockerfile
# ... (기존 내용)

# 비root 사용자 생성 및 권한 설정
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 3000
CMD ["node", "-e", "require('next/dist/bin/next').nextStart()"]
```

**체크리스트**:
- [ ] Dockerfile에 USER 지시문 추가
- [ ] 도커 이미지 빌드 테스트
- [ ] 이미지 실행 테스트 (`docker run ...`)

---

#### [OPS-002] .dockerignore 점검

**파일**: `.dockerignore`

**포함되어야 할 항목**:
```
# 환경변수
.env
.env.*

# SQLite 파일 (이제 불필요)
*.db
*.db-shm
*.db-wal

# 개발 파일
node_modules
.git
.gitignore
.next
.prettierignore
.eslintignore

# CI/CD
.github

# 압축 파일
*.zip
*.tar.gz
```

**체크리스트**:
- [ ] .dockerignore 확인
- [ ] 불필요한 파일 제외 설정 확인

---

## 3. 배포 절차 (Phase 3)

### 🔵 우선순위 3 — 배포 후 (수동 확인)

**실행자**: 프로젝트 관리자 또는 DevOps

1. **[ ] Supabase Dashboard 확인**
   - Database → Tables에서 테이블 생성 확인
   - Row counts가 0으로 표시되어야 함

2. **[ ] `deploy.ps1` 실행**
   ```powershell
   .\deploy.ps1
   ```
   - 내부 순서:
     1. Git push
     2. S3 업로드
     3. SSM으로 EC2 빌드·배포

3. **[ ] 배포 후 동작 확인**
   - [ ] 로그인 페이지 접근
   - [ ] 라이선스 목록 조회
   - [ ] 대시보드 접근
   - [ ] Cron 수동 호출 (갱신 알림 테스트)
     ```bash
     curl -X POST http://ec2-ip:8080/api/cron/renewal-notify \
       -H "Authorization: Bearer $CRON_SECRET"
     ```

---

## 4. 롤백 계획

### 만약 문제가 발생하면:

1. **로컬 테스트 실패**
   - 원래 SQLite로 롤백
   - Prisma 스키마 복구
   - 의존성 복구 (`npm install better-sqlite3 ...`)

2. **배포 후 DB 연결 실패**
   - SSM Parameter Store의 DATABASE_URL 확인
   - Supabase 프로젝트 상태 확인 (대시보드)
   - 네트워크/방화벽 설정 확인

3. **데이터 손실**
   - Supabase 자동 백업 사용 (최근 7일)
   - 백업에서 복구

---

## 5. 완료 기준

### 백엔드 완료 조건:
- [x] [BE-010] Prisma 스키마 변경
- [x] [BE-011] Prisma 클라이언트 설정 변경
- [x] [BE-012] 패키지 의존성 제거
- [x] [BE-013] Supabase 마이그레이션 초기화

### DevOps 완료 조건:
- [x] [OPS-010] 배포 스크립트 업데이트
- [x] [OPS-011] 환경변수 문서화
- [x] [OPS-001] Dockerfile 보안 개선
- [x] [OPS-002] .dockerignore 점검

### 배포 완료 조건:
- [x] Supabase Dashboard 확인
- [x] deploy.ps1 실행
- [x] 배포 후 기능 테스트

---

## 6. 참고 자료

- **Supabase 공식 문서**: https://supabase.com/docs
- **Prisma PostgreSQL**: https://www.prisma.io/docs/orm/overview/databases/postgresql
- **마이그레이션 가이드**: https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate

---

## 7. 일정 및 의존성

- **예상 소요 시간**: 5~7일 (백엔드 2일 + DevOps 2일 + 테스트 2일)
- **선행 조건**: Supabase 계정 및 프로젝트 생성
- **후행 조건**: Phase 2 (자산 유형 확장) 시작 가능

---

## 8. 체크리스트 (한눈에 보기)

### 백엔드
- [ ] BE-010: Prisma 스키마 변경
- [ ] BE-011: Prisma 클라이언트 설정 변경
- [ ] BE-012: 패키지 의존성 제거
- [ ] BE-013: Supabase 마이그레이션 초기화

### DevOps
- [ ] OPS-010: 배포 스크립트 업데이트
- [ ] OPS-011: 환경변수 문서화
- [ ] OPS-001: Dockerfile 비root 사용자
- [ ] OPS-002: .dockerignore 점검

### 배포 (수동)
- [ ] Supabase Dashboard 확인
- [ ] deploy.ps1 실행
- [ ] 기능 테스트 (로그인, 라이선스, 대시보드)
