# 🎫 활성 티켓 (Active Tickets)

> **Phase 2: 자산 유형 확장 (Asset Management Abstraction)**
>
> 라이선스 → 통합 자산 관리로 확장
> 소프트웨어, 클라우드, 하드웨어, 도메인 등 모든 IT 자산 통합 관리
>
> **상태**: 티켓 오픈 (2026-03-07)
> **목표 완료일**: 2026-03-28 (3주)
>
> 📌 **Priority 2 (배포 전 마무리) ✅ COMPLETED**
> - FE-001, FE-ORG-001, BE-ORG-001, BE-ORG-002, OPS-010/011/001/002 모두 완료
> - 배포 준비 완료 → 다음 단계: 자산 관리 기능 확장

---

## 👥 Role별 티켓 할당

---

## 🔓 공개 열람 모드 (2026-03-11 추가)

> **목표**: 로그인 없이 모든 페이지 열람 가능. 생성·수정·삭제 등 쓰기 작업만 로그인 요구.
>
> **배경**: 사내 폐쇄망 환경에서 구성원 누구나 라이선스/자산 현황을 즉시 조회할 수 있어야 함.
> 로그인 장벽 제거 → 조회는 자유, 변경은 인증 필요.
>
> **의존성**: BE-050 완료 후 FE-050 진행 (순서 무관하게 병렬 가능)

---

### [BE-050] GET API 공개 접근 — 인증 체크 제거

**담당**: Backend Role
**우선순위**: 🔴 즉시 (FE-050과 병렬)
**난이도**: 🟢 쉬움 (반나절)
**상태**: 🔴 오픈

#### 변경 내용

모든 `GET /api/*` 핸들러에서 `getCurrentUser()` 인증 체크를 제거한다.
`POST / PUT / PATCH / DELETE` 핸들러는 그대로 유지.

**예외 — 변경 금지 (여전히 인증 필요)**:
- `GET /api/admin/*` — 사용자 목록 등 관리자 전용 데이터
- `GET /api/auth/*` — 인증 관련 엔드포인트

#### 변경할 파일 목록

```
app/api/licenses/route.ts         GET 핸들러 상단 auth 체크 제거
app/api/licenses/[id]/route.ts    GET 핸들러 상단 auth 체크 제거
app/api/licenses/[id]/seats/route.ts
app/api/licenses/[id]/owners/route.ts
app/api/licenses/[id]/renewal-history/route.ts
app/api/licenses/[id]/assignments/route.ts
app/api/employees/route.ts        GET 핸들러 상단 auth 체크 제거
app/api/employees/[id]/route.ts   GET 핸들러 상단 auth 체크 제거
app/api/assets/route.ts           GET 핸들러 상단 auth 체크 제거
app/api/assets/[id]/route.ts      GET 핸들러 상단 auth 체크 제거
app/api/assets/expiring/route.ts  GET 핸들러 상단 auth 체크 제거
app/api/groups/route.ts
app/api/org/units/route.ts
app/api/org/units/[id]/route.ts
app/api/org/companies/[id]/route.ts (GET 있으면)
app/api/seats/route.ts
app/api/history/route.ts
app/api/dashboard/route.ts (있으면)
app/api/reports/monthly/*/route.ts  GET 핸들러 auth 체크 제거
```

#### 변경 패턴

```typescript
// BEFORE
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  // ... 나머지 로직
}

// AFTER
export async function GET(request: NextRequest) {
  // auth 체크 없음 — 공개 접근 허용
  try {
    // ... 나머지 로직 (동일)
  }
}
```

#### 완료 조건

- [ ] 모든 GET API가 `Authorization: Bearer` 없이 200 반환
- [ ] POST/PUT/PATCH/DELETE는 여전히 401 반환 (미인증 시)
- [ ] `/api/admin/*` GET은 여전히 401 반환 (미인증 시)

---

### [FE-050] 공개 열람 모드 — proxy.ts + 레이아웃 + 페이지 컴포넌트

**담당**: Frontend Role
**우선순위**: 🔴 즉시 (BE-050과 병렬)
**난이도**: 🟡 중간 (1일)
**상태**: 🔴 오픈

#### 변경 내용

1. **`proxy.ts`** — 페이지 접근 제한 해제, API 변경 요청만 인증 요구
2. **`app/layout.tsx`** — 미인증 시 내비게이션 표시 + 로그인 버튼
3. **`app/change-password/page.tsx`** — 강제 비밀번호 변경 흐름 유지 (로그인한 사용자만)
4. **개별 페이지 컴포넌트** — 수정/삭제/등록 버튼을 미인증 시 숨기거나 클릭 시 로그인으로 유도

---

#### 1. `proxy.ts` 변경

```typescript
// BEFORE: 미인증 → 페이지는 /login으로 리다이렉트, API는 401
// AFTER:  미인증 → 페이지는 그대로 통과, API GET은 통과, API 변경(POST 등)은 401

// 변경 후 로직:
// 1. /_next, /favicon, static → pass
// 2. /login, /api/auth, /api/cron → pass
// 3. pathname.startsWith("/api/") 이고 method가 POST/PUT/PATCH/DELETE 이고 token 없음 → 401
// 4. 나머지 → pass (페이지는 항상 통과)
```

**구체적 변경**:
```typescript
const sessionToken = request.cookies.get("session_token")?.value;

// API 변경 요청만 인증 요구 (GET은 통과)
if (!sessionToken && pathname.startsWith("/api/")) {
  const method = request.method;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }
}

// 페이지 및 API GET → 항상 통과 (로그인 리다이렉트 없음)
return passthrough();
```

---

#### 2. `app/layout.tsx` 변경

```typescript
// BEFORE:
if (!user && pathname !== "/login") {
  redirect("/login");   // ← 이 줄 제거
}
// {user && <nav>...</nav>}  ← 조건부 표시를 항상 표시로 변경

// AFTER:
// redirect 제거
// 네비게이션: 항상 표시 (user 유무 무관)
// 우측 영역: 로그인 상태면 username + 로그아웃, 미인증이면 "로그인" 링크
```

**변경 후 우측 영역 (nav 안):**
```tsx
{user ? (
  <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
    <span className="text-xs text-gray-400">{user.username}</span>
    <LogoutButton />
  </div>
) : (
  <div className="border-l border-gray-200 pl-4">
    <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
      로그인
    </Link>
  </div>
)}
```

**admin 메뉴**: `user?.role === "ADMIN"` 일 때만 표시 (기존과 동일)

---

#### 3. 수정/삭제/등록 버튼 처리

각 페이지에서 `user` prop 또는 서버 컴포넌트의 `getCurrentUser()` 결과를 기반으로:

**원칙**: 미인증 사용자에게 **버튼 자체를 숨긴다** (클릭 유도 방식보다 단순)

```tsx
// 예시 — 라이선스 목록 페이지
{user && (
  <Link href="/licenses/new">
    <button>+ 라이선스 등록</button>
  </Link>
)}

// 예시 — 상세 페이지 수정/삭제 버튼
{user && (
  <Link href={`/licenses/${id}/edit`}>수정</Link>
)}
{user?.role === "ADMIN" && (
  <button onClick={handleDelete}>삭제</button>
)}
```

**변경이 필요한 페이지 목록**:
```
app/licenses/page.tsx           "등록" 버튼 → user 있을 때만
app/licenses/[id]/page.tsx      "수정", "삭제" → user 있을 때만
app/licenses/[id]/edit/page.tsx 이 페이지 자체 → user 없으면 /login 리다이렉트
app/licenses/new/page.tsx       이 페이지 자체 → user 없으면 /login 리다이렉트
app/employees/page.tsx          "등록" 버튼 → user 있을 때만
app/employees/[id]/page.tsx     "수정", "삭제" → user 있을 때만
app/assets/page.tsx             "등록" 버튼 → user 있을 때만
app/assets/[id]/page.tsx        "수정", "삭제" → user 있을 때만
app/org/page.tsx                편집 UI → user 있을 때만
app/settings/import/page.tsx    → user 없으면 /login 리다이렉트 (쓰기 전용 페이지)
app/settings/groups/page.tsx    그룹 생성/삭제 → user 있을 때만
app/admin/users/page.tsx        → user 없거나 ADMIN 아니면 /login 리다이렉트 (유지)
```

> ⚠️ **읽기 전용 페이지** (목록, 상세)는 미인증 접근 허용.
> **쓰기 전용 페이지** (new, edit)는 미인증 시 `/login?redirect=<원래경로>` 리다이렉트.

---

#### 4. 로그인 후 원래 페이지 복귀 (선택 구현)

`/login?redirect=/licenses/new` 형태로 이동 후, 로그인 성공 시 `redirect` 파라미터 경로로 복귀.
현재 로그인 페이지가 이를 지원하지 않으면 추가 구현 필요.

---

#### 완료 조건

- [ ] 비로그인 상태로 `/licenses`, `/employees`, `/dashboard`, `/org`, `/history` 접근 가능
- [ ] 비로그인 상태에서 nav가 표시되고, 우측에 "로그인" 링크 노출
- [ ] 비로그인 상태에서 `+ 등록`, `수정`, `삭제` 버튼이 보이지 않음
- [ ] `/licenses/new`, `/licenses/[id]/edit` 직접 접근 시 로그인 페이지로 이동
- [ ] 로그인 후 기존과 동일하게 모든 기능 작동
- [ ] `/admin/users` 는 ADMIN 로그인 필수 (기존 동작 유지)

---

## 🎯 BACKEND 티켓

### [BE-020] Prisma Schema — Asset 모델 추가

**담당**: Backend Role
**우선순위**: 🔴 Critical (Phase 2 블로커)
**난이도**: 🟡 중간 (1-2일)
**상태**: 🔴 오픈

#### 배경
- 현재: License 중심의 라이선스 관리 시스템
- 목표: Asset 기반의 통합 자산 관리 시스템으로 확장
- 자산 유형: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
- 각 자산은 할당, 비용, 만료일, 상태 관리 필요

#### 요구사항
- [ ] `prisma/schema.prisma` 수정
  - `Asset` 테이블 (기본 자산 정보)
  - `AssetType` enum: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
  - `AssetStatus` enum: ACTIVE, INACTIVE, DISPOSED

- [ ] Asset 모델 구조:
  ```prisma
  model Asset {
    id String @id @default(cuid())
    name String @db.VarChar(255)
    type AssetType
    status AssetStatus @default(ACTIVE)

    description String? @db.Text
    cost Decimal @db.Decimal(15, 2)
    currency String @default("USD")
    expiryDate DateTime?

    // 할당 정보
    assignments Assignment[]
    assignedTo Employee?
    assignedToId String?

    // 메타데이터
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    createdBy String

    // 감사
    auditLogs AuditLog[]
  }

  enum AssetType {
    SOFTWARE
    CLOUD
    HARDWARE
    DOMAIN_SSL
    OTHER
  }

  enum AssetStatus {
    ACTIVE
    INACTIVE
    DISPOSED
  }
  ```

- [ ] Assignment 모델 확장
  - `Asset`과의 관계 추가
  - License → Asset 마이그레이션 지원

- [ ] AuditLog 지원
  - entityType: ASSET 추가
  - 자산 생성/수정/삭제 로깅

#### 완료 조건
- [ ] Prisma schema 수정 완료
- [ ] `prisma migrate dev` 실행
- [ ] Prisma 클라이언트 재생성 (`prisma generate`)
- [ ] DB 마이그레이션 파일 생성됨
- [ ] 기존 License 기능 영향 없음

#### 기술 사항
- **파일**: `prisma/schema.prisma`
- **명령어**:
  ```bash
  npx prisma migrate dev --name add_asset_model
  npx prisma generate
  ```
- **참고**: `generated/prisma/` 업데이트 확인

#### 종속성
- 없음 (독립적, 모든 API의 기반)

---

### [BE-021] GET|POST /api/assets — 자산 목록 및 등록

**담당**: Backend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (1-2일)
**상태**: 🔴 오픈

#### 배경
- Asset 테이블이 생성된 후 기본 CRUD API 필요
- 목록 조회: 필터링, 정렬, 페이지네이션 지원
- 자산 등록: 유효성 검증, AuditLog 기록

#### 요구사항

**GET /api/assets (목록 조회)**
- [ ] 쿼리 파라미터 지원
  - `type`: AssetType 필터 (SOFTWARE, CLOUD 등)
  - `status`: AssetStatus 필터 (ACTIVE, INACTIVE, DISPOSED)
  - `search`: 자산명 검색
  - `skip`, `take`: 페이지네이션 (기본값: skip=0, take=20)
  - `sortBy`: 정렬 필드 (name, cost, expiryDate, createdAt)
  - `sortOrder`: asc, desc

- [ ] 응답 형식
  ```json
  {
    "total": 150,
    "data": [
      {
        "id": "...",
        "name": "Microsoft 365",
        "type": "SOFTWARE",
        "status": "ACTIVE",
        "cost": 1200.00,
        "currency": "USD",
        "expiryDate": "2026-12-31",
        "assignedTo": { "id": "...", "name": "이순신" },
        "createdAt": "2026-01-15",
        "updatedAt": "2026-03-07"
      }
    ]
  }
  ```

- [ ] 권한 검증: 로그인 사용자만

**POST /api/assets (자산 등록)**
- [ ] 요청 바디
  ```json
  {
    "name": "AWS EC2 Instance",
    "type": "CLOUD",
    "description": "Production server",
    "cost": 500.00,
    "currency": "USD",
    "expiryDate": "2027-03-07",
    "assignedToId": "user-id" (선택)
  }
  ```

- [ ] 유효성 검증
  - name: 필수, max 255자
  - type: enum 중 하나만
  - cost: 0 이상
  - expiryDate: ISO 8601 형식

- [ ] AuditLog 기록
  - action: CREATED
  - entityType: ASSET
  - details: `{ name, type, cost }`

- [ ] 응답: 201 Created
  ```json
  {
    "id": "...",
    "name": "AWS EC2 Instance",
    ...
  }
  ```

#### 완료 조건
- [ ] GET 엔드포인트 구현
- [ ] POST 엔드포인트 구현
- [ ] 페이지네이션 정상 작동
- [ ] 필터링 정상 작동
- [ ] AuditLog 기록 확인
- [ ] 테스트 완료

#### 기술 사항
- **파일**: `app/api/assets/route.ts` (새로)
- **라이브러리**:
  - `lib/validation.ts` (유효성 검증)
  - `lib/audit-log.ts` (감사 로깅)
  - `lib/prisma.ts` (DB 쿼리)

#### 종속성
- BE-020 (Asset 모델)

---

### [BE-022] GET|PUT|DELETE /api/assets/[id] — 자산 상세·수정·삭제

**담당**: Backend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (2일)
**상태**: 🔴 오픈

#### 요구사항

**GET /api/assets/[id] (상세 조회)**
- [ ] Asset 상세 정보 반환
- [ ] 할당 이력 포함 (Assignment)
- [ ] 감사 로그 링크 포함

**PUT /api/assets/[id] (수정)**
- [ ] 수정 가능 필드
  - name, description, cost, currency, expiryDate

- [ ] AuditLog 기록 (변경 사항만)

**DELETE /api/assets/[id] (삭제)**
- [ ] 소프트 삭제 또는 하드 삭제
  - 상태: DISPOSED로 변경 (권장)
  - 또는 아예 삭제

- [ ] AuditLog 기록

#### 완료 조건
- [ ] 3개 메서드 모두 구현
- [ ] 권한 검증
- [ ] 에러 처리 (404, 400, 403 등)
- [ ] 테스트 완료

#### 기술 사항
- **파일**: `app/api/assets/[id]/route.ts` (새로)

#### 종속성
- BE-020, BE-021

---

### [BE-023] PATCH /api/assets/[id]/status — 자산 상태 변경

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟢 낮음 (0.5일)
**상태**: 🔴 오픈

#### 배경
- 자산 상태 변경: ACTIVE → INACTIVE → DISPOSED
- 배포 후 폐기 처리 시 필요

#### 요구사항
- [ ] 요청 바디: `{ status: "INACTIVE" | "DISPOSED" }`
- [ ] 응답: 200 OK
- [ ] AuditLog 기록

#### 종속성
- BE-020

---

### [BE-024] GET /api/assets/expiring — 만료 임박 자산

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟢 낮음 (1일)
**상태**: 🔴 오픈

#### 배경
- 만료 예정 자산 미리 파악
- 대시보드에 표시할 정보

#### 요구사항
- [ ] 쿼리: `?days=30` (30일 내 만료)
- [ ] 응답: 만료 임박 자산 목록
- [ ] 정렬: expiryDate 기준 오름차순

#### 종속성
- BE-020, BE-021

---

### [BE-025] POST /api/cron/renewal-notify — 만료 알림 통합

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟡 중간 (2일)
**상태**: 🔴 오픈

#### 배경
- 기존: License 만료 알림만 지원
- 목표: Asset 만료 알림도 통합

#### 요구사항
- [ ] Asset의 expiryDate 기반 알림
- [ ] Slack/Email 발송
- [ ] 배치 스케줄러 등록 (매월 1일 등)

#### 종속성
- BE-020 ~ BE-024

---

## 🎨 FRONTEND 티켓

### [FE-010] /assets — 자산 목록 페이지

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (3-4일)
**상태**: ✅ COMPLETED (2026-03-08)

#### 배경
- 자산 관리의 핵심 페이지
- 모든 IT 자산 통합 조회
- 필터링, 검색, 정렬 지원

#### 요구사항
- [ ] `/assets` 라우트 추가
- [ ] 탭 인터페이스
  - 전체 / SOFTWARE / CLOUD / HARDWARE / DOMAIN_SSL / 기타
  - 각 탭별로 자동 필터링

- [ ] 테이블 또는 카드 뷰
  - 컬럼: 자산명, 유형, 상태, 비용, 만료일, 할당자
  - 상태별 배지 (ACTIVE, INACTIVE, DISPOSED)

- [ ] 기능
  - 검색: 자산명 검색
  - 정렬: 비용, 만료일, 생성일
  - 페이지네이션
  - 대량 선택 (미래 확장용)

- [ ] 새 자산 버튼
  - `/assets/new` 링크

- [ ] 각 자산 클릭 → 상세 페이지

#### 완료 조건
- [ ] 페이지 구현 완료
- [ ] API 호출 정상
- [ ] 필터/검색/정렬 정상
- [ ] 모바일 반응형 검증

#### 기술 사항
- **파일**: `app/assets/page.tsx` (새로)
- **API**: GET /api/assets

#### 종속성
- BE-021

---

### [FE-011] /assets/new — 자산 등록 폼

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (2-3일)
**상태**: ✅ COMPLETED (2026-03-08)

#### 요구사항
- [ ] 자산 유형별 동적 폼
  - SOFTWARE: 라이선스 키, 버전, 라이센스 수
  - CLOUD: 플랫폼, 계정ID, 좌석 수
  - HARDWARE: 제조사, 모델, SN, 위치
  - DOMAIN_SSL: 도메인명, 인증서 유효기간
  - OTHER: 자유 형식

- [ ] 공통 필드
  - 자산명 (필수)
  - 설명 (선택)
  - 비용
  - 통화
  - 만료일
  - 할당 대상 (선택)

- [ ] 폼 검증
  - 필수 필드 확인
  - 비용 숫자 검증
  - 날짜 형식 검증

- [ ] 제출 시 POST /api/assets 호출

#### 완료 조건
- [ ] 폼 구현 완료
- [ ] 유형별 필드 동적 표시
- [ ] 검증 및 에러 처리
- [ ] 성공 메시지 & 리다이렉트

#### 기술 사항
- **파일**: `app/assets/new/page.tsx` (새로)
- **API**: POST /api/assets

#### 종속성
- BE-021

---

### [FE-012] /assets/[id] — 자산 상세 페이지

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (2-3일)
**상태**: ✅ COMPLETED (2026-03-08)

#### 요구사항
- [ ] 자산 정보 표시
  - 기본 정보 (이름, 유형, 상태, 비용)
  - 유형별 추가 정보
  - 할당 정보
  - 만료일

- [ ] 액션 버튼
  - 수정 (FE-ORG-001 패턴 참고)
  - 상태 변경 (ACTIVE → INACTIVE → DISPOSED)
  - 삭제

- [ ] 할당 이력
  - 이 자산이 누구에게 할당되었는지
  - 할당/반납 이력

- [ ] 감사 로그 링크
  - 이 자산의 변경 이력 조회

#### 완료 조건
- [ ] 상세 페이지 구현
- [ ] 편집 모달 추가
- [ ] 상태 변경 기능
- [ ] 삭제 확인 모달

#### 기술 사항
- **파일**: `app/assets/[id]/page.tsx` (새로)
- **API**: GET /api/assets/[id], PUT /api/assets/[id], DELETE /api/assets/[id]

#### 종속성
- BE-022

---

## 📋 종합 테이블

| 티켓 | Role | 우선순위 | 난이도 | 상태 | 예상 기간 |
|------|------|---------|--------|------|----------|
| BE-020 | Backend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 1-2일 |
| BE-021 | Backend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 1-2일 |
| BE-022 | Backend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 2일 |
| BE-023 | Backend | 🟠 높음 | 🟢 낮음 | 🔴 오픈 | 0.5일 |
| BE-024 | Backend | 🟠 높음 | 🟢 낮음 | 🔴 오픈 | 1일 |
| BE-025 | Backend | 🟠 높음 | 🟡 중간 | 🔴 오픈 | 2일 |
| FE-010 | Frontend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 3-4일 |
| FE-011 | Frontend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 2-3일 |
| FE-012 | Frontend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 2-3일 |

**총 예상 기간**: 16-20일 (병렬 작업 시 7-10일)

---

## 🎯 진행 순서 (권장)

### Phase 1: DB & API 기반 (Week 1)
1. **BE-020**: Prisma Schema (Asset 모델) → `prisma migrate`
2. **BE-021**: GET|POST /api/assets
3. **BE-022**: GET|PUT|DELETE /api/assets/[id]
4. **BE-023, BE-024**: 보조 API

→ **Frontend가 API 호출 가능하도록**

### Phase 2: Frontend UI (Week 2)
- **FE-010**: /assets 목록 페이지
- **FE-011**: /assets/new 등록 폼
- **FE-012**: /assets/[id] 상세 페이지

→ **완전한 Asset CRUD 기능 구현**

### Phase 3: 통합 & 마무리 (Week 3)
- **BE-025**: 만료 알림 통합
- 통합 테스트
- 배포 준비

---

## ✅ 완료 기준

이 Phase 2 티켓들이 모두 완료되면:
- ✅ Asset CRUD (생성·조회·수정·삭제) 완전 구현
- ✅ 자산 유형 관리 (SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL 등)
- ✅ 자산 상태 관리 (ACTIVE, INACTIVE, DISPOSED)
- ✅ 자산 할당 & 이력 관리
- ✅ 자산 검색·필터링·정렬
- ✅ 자산 만료 알림
- ✅ Phase 3-1 (라이선스 계층) 진행 가능

---

## 🎨 PHASE 3-1: 라이선스 계층 구조 (License Hierarchy)

> **개요**: 라이선스 계층화 (부모-자식 관계)
> - Open VPN (상위) → Domain1, Domain2 (하위)
> - Figma (상위) → Full, Dev, Figjam (하위)
>
> **상태**: 🔴 오픈 (2026-03-09)
> **목표 완료일**: 2026-03-21 (2주)
> **스펙**: `tasks/features/license-hierarchy.md`

---

### [BE-040] Prisma Schema — License `parentId` 추가 & API 수정

**담당**: Backend Role
**우선순위**: 🔴 Critical (Phase 3-1 블로커)
**난이도**: 🟡 중간 (2-3일)
**상태**: ✅ 완료 (PR #34, 2026-03-10)

#### 배경
- 라이선스를 계층화하여 관리
- 예: Open VPN (상위) 아래 Domain1, Domain2 (하위)
- CSV 임포트도 `parentLicenseName` 필드 지원

#### 요구사항

**[1] Prisma Schema 수정**
- [ ] License 모델에 `parentId` 필드 추가
  ```prisma
  model License {
    ...
    parentId  Int?
    parent    License? @relation("LicenseHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
    children  License[] @relation("LicenseHierarchy")
  }
  ```

- [ ] 마이그레이션 생성: `prisma migrate dev --name add_license_hierarchy`
- [ ] `prisma generate` 실행

**[2] GET /api/licenses API 수정**
- [ ] 계층 구조로 정렬 (부모 먼저, 하위는 들여쓰기)
- [ ] 응답에 `depth`, `parentId`, `children` 포함
  ```json
  {
    "id": 1,
    "name": "Open VPN",
    "parentId": null,
    "children": [{ "id": 2, "name": "Domain1" }, { "id": 3, "name": "Domain2" }]
  }
  ```

**[3] PUT /api/licenses/[id] API 수정**
- [ ] `parentId` 필드 수정 허용
- [ ] 순환 참조 검증 (A→B→A 불가)
  ```
  if (parentId) {
    // Check: parent of parentId should not be this license
  }
  ```
- [ ] 자신을 부모로 설정 불가

**[4] CSV Import 수정**
- [ ] `app/settings/import/templates.ts`: license 헤더에 `parentLicenseName` 추가
- [ ] `app/settings/import/actions.ts`: `importLicenses` 함수 수정
  - `parentLicenseName` 파싱
  - 존재 여부 검증
  - `parentId` 설정

#### 완료 조건
- [ ] 마이그레이션 생성 및 실행
- [ ] GET API: 계층 구조 정렬 정상 작동
- [ ] PUT API: parentId 업데이트 정상 작동
- [ ] 순환 참조 테스트 (에러 발생 확인)
- [ ] CSV import: parentLicenseName 정상 파싱
- [ ] 테스트 완료

#### 기술 사항
- **파일**:
  - `prisma/schema.prisma`
  - `prisma/migrations/` (자동 생성)
  - `app/api/licenses/route.ts`
  - `app/settings/import/templates.ts`
  - `app/settings/import/actions.ts`

#### 종속성
- 없음 (License 기능만 영향)

---

### [FE-040] License UI — 계층 구조 표시 및 편집

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (3-4일)
**상태**: 🔴 오픈

#### 요구사항

**[1] 라이선스 목록 페이지 (GET /licenses)**
- [ ] 계층 구조 시각화
  - 상위 라이선스: 루트 레벨
  - 하위 라이선스: 들여쓰기 + 아이콘 (└─)
  - 예시:
    ```
    Open VPN
    └─ Domain1.com
    └─ Domain2.com
    Figma
    └─ Full
    └─ Dev
    ```

**[2] 라이선스 편집 페이지 (/licenses/[id]/edit)**
- [ ] "상위 라이선스" 드롭다운 추가
  - 선택 가능한 상위 라이선스 목록
  - "없음" 옵션 (루트)
  - 자신을 부모로 선택 불가 (비활성화)

**[3] 라이선스 상세 페이지 (/licenses/[id])**
- [ ] 하위 라이선스 섹션
  - 있으면: "관련 라이선스" 섹션에 테이블로 표시
  - 없으면: 숨김

**[4] CSV 템플릿 다운로드**
- [ ] 라이선스 CSV 헤더: `parentLicenseName` 컬럼 추가
- [ ] 샘플 행: 계층 구조 예시 포함

#### 완료 조건
- [ ] 목록: 계층 구조 정상 렌더링
- [ ] 편집: parentId 드롭다운 정상 작동
- [ ] 상세: 하위 라이선스 표시
- [ ] CSV 템플릿: parentLicenseName 컬럼 추가
- [ ] 스타일: Tailwind 일관성 유지

#### 기술 사항
- **파일**:
  - `app/licenses/page.tsx`
  - `app/licenses/[id]/page.tsx`
  - `app/licenses/[id]/edit/page.tsx`
  - 트리 렌더링 유틸 (필요 시 신규)

#### 종속성
- BE-040 (API 수정 완료)

---

## 📚 참고 문서

- `tasks/VISION.md` — 최종 목표 및 Phase별 로드맵
- `tasks/features/asset-management.md` — 자산 관리 상세 스펙
- `tasks/features/license-hierarchy.md` — 라이선스 계층 구조 스펙
- `tasks/current-state.md` — 현재 프로젝트 상태

---

**Phase 3-1 (라이선스 계층)이 완료되면 Phase 3-2 (월별 보고서)로 진행합니다.** 🚀
