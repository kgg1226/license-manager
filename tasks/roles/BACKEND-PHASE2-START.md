# 🔧 Backend Phase 2 빠른 시작 가이드

> **역할**: Backend (/backend)
> **Phase**: Phase 2 — Asset Management Abstraction
> **기간**: 2026-03-07 ~ 2026-03-28 (3주)
> **목표**: Asset 기반 통합 자산 관리 API 구현

---

## ⚡ 5분 안에 시작하기

### 1. 문서 확인 (필독)
```bash
# 작업 명세
cat tasks/TICKETS.md          # BE-020~025 티켓 상세 요구사항

# 데이터베이스 설계
cat tasks/phase2-db-design.md # Asset 모델, Schema 정의

# API 스펙
cat tasks/api-spec.md         # 기존 API 개발 규칙 확인

# 보안 정책
cat tasks/security/guidelines.md # ISMS-P 컴플라이언스 규칙
```

### 2. Branch 전환
```bash
# Planning 역할 worktree에서 Backend 역할로 전환
/backend

# 또는 수동 worktree 전환
cd /c/asset-manager/.claude/worktrees/[role]/
```

### 3. 현재 상태 확인
```bash
npm run dev          # Dev server 시작 (포트 3000)
curl http://localhost:3000/api/assets  # 아직 구현 안 됨 (404)
```

---

## 🎯 Phase 2 Backend 티켓 (6개)

| 순번 | 티켓 | 제목 | 난이도 | 예상 기간 | 상태 |
|------|------|------|--------|---------|------|
| 1 | **BE-020** | Prisma Schema — Asset 모델 추가 | 🟡 중간 | 1-2일 | 🔴 오픈 |
| 2 | **BE-021** | GET\|POST /api/assets — 자산 목록 및 등록 | 🟡 중간 | 1-2일 | 🔴 오픈 |
| 3 | **BE-022** | GET\|PUT\|DELETE /api/assets/[id] — CRUD | 🟡 중간 | 1-2일 | 🔴 오픈 |
| 4 | **BE-023** | PATCH /api/assets/[id]/status — 상태 변경 | 🟢 쉬움 | 0.5-1일 | 🔴 오픈 |
| 5 | **BE-024** | POST /api/cron/assets/expire-notification — 만료 알림 | 🟠 어려움 | 1-2일 | 🔴 오픈 |
| 6 | **BE-025** | GET /api/assets/cost-analysis — 비용 분석 | 🟠 어려움 | 1-2일 | 🔴 오픈 |

**💡 추천 순서**: BE-020 → BE-021 → BE-022 → BE-023 → BE-024/025

---

## 📋 Ticket 상세 요약

### **BE-020: Prisma Schema — Asset 모델 추가** 🔴 Critical (블로커)

**목표**: Asset 테이블 및 관련 모델 정의

**구현 내용**:
1. `prisma/schema.prisma` 수정
   - `Asset` 모델 추가
   - `AssetType` enum: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
   - `AssetStatus` enum: ACTIVE, INACTIVE, DISPOSED
   - `Assignment` 모델에 `assetId` 필드 추가

2. 마이그레이션 실행
   ```bash
   npx prisma migrate dev --name "add_asset_model"
   npx prisma generate
   ```

3. 검증
   ```bash
   # generated/prisma/ 업데이트 확인
   ls generated/prisma/
   ```

**완료 조건**:
- [ ] Asset 모델 정의 완료
- [ ] 마이그레이션 파일 생성됨 (`prisma/migrations/*/migration.sql`)
- [ ] `prisma generate` 성공
- [ ] DB에 Asset 테이블 생성됨
- [ ] 기존 License 기능 동작 확인

**참고**:
- 스키마 정의: `tasks/phase2-db-design.md`
- Prisma 문서: https://www.prisma.io/docs

---

### **BE-021: GET|POST /api/assets — 자산 목록 및 등록**

**목표**: Asset 기본 CRUD의 Read/Create 구현

**구현 파일**:
- `app/api/assets/route.ts`

**기능**:
1. **GET /api/assets** (목록 조회)
   - 쿼리 파라미터: `type`, `status`, `search`, `skip`, `take`, `sortBy`, `sortOrder`
   - 페이지네이션, 필터링, 정렬 지원
   - 응답: `{ total, data: Asset[] }`

2. **POST /api/assets** (자산 등록)
   - 요청 바디: `{ name, type, description, cost, currency, expiryDate, assignedToId }`
   - 유효성 검증 (name, type, cost)
   - AuditLog 기록 (`action: CREATED, entityType: ASSET`)
   - 응답: 201 Created + Asset 객체

**완료 조건**:
- [ ] GET /api/assets 구현
- [ ] POST /api/assets 구현
- [ ] 페이지네이션 테스트 통과
- [ ] 필터링 테스트 통과
- [ ] AuditLog 기록 확인
- [ ] 에러 처리 (400, 401, 500)

**참고**:
- TICKETS.md: BE-021 상세 명세
- `lib/audit-log.ts`: AuditLog 기록 함수
- `tasks/api-spec.md`: API 개발 규칙

---

### **BE-022: GET|PUT|DELETE /api/assets/[id] — 조회/수정/삭제**

**목표**: Asset 기본 CRUD의 Read(Detail)/Update/Delete 구현

**구현 파일**:
- `app/api/assets/[id]/route.ts`

**기능**:
1. **GET /api/assets/[id]** (상세 조회)
   - 응답: Asset + assignedTo Employee 정보

2. **PUT /api/assets/[id]** (수정)
   - 수정 가능 필드: `name`, `description`, `cost`, `currency`, `expiryDate`, `assignedToId`, `status`
   - 변경 사항 기록 (before/after)
   - AuditLog: `action: UPDATED, changes: { before, after }`

3. **DELETE /api/assets/[id]** (삭제)
   - Soft delete 또는 Hard delete 결정
   - AuditLog: `action: DELETED`

**완료 조건**:
- [ ] GET /api/assets/[id] 구현
- [ ] PUT /api/assets/[id] 구현
- [ ] DELETE /api/assets/[id] 구현
- [ ] 404 처리 (존재하지 않는 자산)
- [ ] 권한 검증 (로그인 필수)
- [ ] AuditLog 기록 확인

---

### **BE-023: PATCH /api/assets/[id]/status — 상태 변경**

**목표**: Asset 상태(ACTIVE → INACTIVE → DISPOSED) 변경 API

**구현 파일**:
- `app/api/assets/[id]/status/route.ts`

**기능**:
- **PATCH /api/assets/[id]/status**
  - 요청 바디: `{ status: "ACTIVE" | "INACTIVE" | "DISPOSED", reason?: string }`
  - 상태 전환 검증 (가능한 전환만 허용)
  - AuditLog: `action: STATUS_CHANGED, details: { from, to, reason }`

**완료 조건**:
- [ ] PATCH 엔드포인트 구현
- [ ] 상태 전환 검증
- [ ] AuditLog 기록

---

### **BE-024: POST /api/cron/assets/expire-notification — 만료 알림 배치**

**목표**: 만료 예정 자산 알림 스케줄러 구현

**구현 파일**:
- `app/api/cron/assets/expire-notification/route.ts`
- `lib/notification.ts` (기존 함수 활용)

**기능**:
- 매일 자정 또는 지정 시간에 실행
- expiryDate가 7일 이내인 자산 조회
- Slack/Email 알림 발송
- NotificationLog 기록

**완료 조건**:
- [ ] Cron 엔드포인트 구현
- [ ] 만료 예정 자산 조회 쿼리
- [ ] Slack/Email 알림 발송
- [ ] NotificationLog 기록

**참고**:
- `lib/notification.ts`: nodemailer, Slack API
- `app/api/cron/licenses/expire-notification/route.ts`: 기존 예제 (License용)

---

### **BE-025: GET /api/assets/cost-analysis — 비용 분석**

**목표**: Asset 유형별 비용 분석 및 리포팅 API

**구현 파일**:
- `app/api/assets/cost-analysis/route.ts`

**기능**:
- **집계 통계**
  - 유형별 총 비용 (type별 합계)
  - 상태별 비용 (status별 합계)
  - 월별/년도별 비용 추세

- **응답 형식**
  ```json
  {
    "summary": {
      "totalCost": 50000.00,
      "currency": "USD",
      "assetCount": 25
    },
    "byType": [
      { "type": "SOFTWARE", "count": 10, "cost": 30000.00 },
      { "type": "CLOUD", "count": 8, "cost": 15000.00 },
      ...
    ],
    "byStatus": [
      { "status": "ACTIVE", "count": 20, "cost": 45000.00 },
      ...
    ]
  }
  ```

**완료 조건**:
- [ ] 집계 쿼리 구현
- [ ] 응답 형식 정의
- [ ] 성능 최적화 (대량 데이터 처리)

---

## 🔍 개발 흐름

### 1. 스키마 설계 (완료 ✅)
```bash
# 필독
cat tasks/phase2-db-design.md
```

### 2. BE-020: Schema 수정
```bash
cd /c/asset-manager

# 1. schema.prisma 수정 (Asset 모델 추가)
# 2. 마이그레이션 실행
npx prisma migrate dev --name "add_asset_model"

# 3. 클라이언트 재생성
npx prisma generate

# 4. 검증
git diff prisma/schema.prisma
ls generated/prisma/
```

### 3. BE-021 ~ BE-025: API 구현
```bash
# 각 API route 구현
app/api/assets/route.ts              # GET, POST
app/api/assets/[id]/route.ts         # GET, PUT, DELETE
app/api/assets/[id]/status/route.ts  # PATCH
app/api/cron/assets/expire-notification/route.ts  # Cron
app/api/assets/cost-analysis/route.ts # Analysis

# 테스트
npm run dev
curl http://localhost:3000/api/assets
```

### 4. 코드 리뷰 및 테스트
```bash
# 기본 테스트
npm test

# 수동 테스트 (Postman, curl)
curl -X GET http://localhost:3000/api/assets
curl -X POST http://localhost:3000/api/assets \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Asset","type":"SOFTWARE","cost":1000}'
```

---

## ✅ 완료 기준

각 티켓별 완료 조건 체크:

### BE-020
- [x] Prisma schema 수정
- [x] 마이그레이션 실행
- [x] `prisma generate` 성공
- [x] DB 테이블 생성 확인
- [x] 기존 기능 영향 없음

### BE-021
- [ ] GET /api/assets 정상 작동
- [ ] POST /api/assets 정상 작동
- [ ] 페이지네이션, 필터링 정상
- [ ] AuditLog 기록

### BE-022
- [ ] GET|PUT|DELETE 정상 작동
- [ ] 404, 400 에러 처리
- [ ] AuditLog 기록

### BE-023
- [ ] PATCH /api/assets/[id]/status 정상 작동
- [ ] 상태 전환 검증
- [ ] AuditLog 기록

### BE-024
- [ ] Cron 엔드포인트 작동
- [ ] 알림 발송 확인
- [ ] NotificationLog 기록

### BE-025
- [ ] GET /api/assets/cost-analysis 정상 작동
- [ ] 집계 데이터 정확성 확인

---

## 📚 참고 자료

- **TICKETS.md**: BE-020~025 상세 명세
- **phase2-db-design.md**: Schema 설계
- **api-spec.md**: API 개발 규칙
- **security/guidelines.md**: ISMS-P 컴플라이언스
- **CLAUDE.md**: 프로젝트 전체 구조

---

## 💬 Q&A

**Q: Soft delete vs Hard delete?**
A: 감사 로그 추적을 위해 Soft delete (status = DISPOSED) 권장. Hard delete는 보안상 민감한 정보만 사용.

**Q: Assignment와 Asset의 관계?**
A: Assignment는 Employee ↔ Asset 매핑. 한 직원이 여러 Asset을 할당받을 수 있음.

**Q: 기존 License 기능은?**
A: Asset 추가 후에도 License 독립 실행. 향후 License → Asset 마이그레이션은 Phase 3.

---

## 🚀 다음 단계

1. **BE-020 완료** → Frontend BE-021 대기 (API 스펙 확정)
2. **BE-021~022 완료** → FE-010 (Asset 목록 페이지) 구현 가능
3. **BE-023~025 완료** → Phase 2 완료

**예상 완료 일정**: 2026-03-14 (1주)

---

**시작하기**: `/backend` 명령어로 Backend 역할로 전환 후, TICKETS.md의 BE-020부터 시작하세요! 🚀
