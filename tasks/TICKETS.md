# 🎫 활성 티켓 (Active Tickets)

> **우선순위 2: 배포 전 마무리**
>
> 모든 작업이 완료되어야 프로덕션 배포 가능
> 최종 목표: 안정적인 라이선스 관리 시스템 + 배포 준비
>
> **상태**: 티켓 오픈 (2026-03-07)
> **목표 완료일**: 2026-03-14 (1주)

---

## 👥 Role별 티켓 할당

---

## 🎯 FRONTEND 티켓

### [FE-001] mustChangePassword 강제 비밀번호 변경 UI

**담당**: Frontend Role
**우선순위**: 🟠 높음 (배포 블로커)
**난이도**: 🟢 낮음 (1-2일)
**상태**: 🔴 오픈

#### 배경
- User 모델에 `mustChangePassword` 필드 추가됨
- Admin이 사용자 생성 시 임시 비밀번호 발급하는 경우
- 사용자는 첫 로그인 후 반드시 비밀번호 변경해야 함

#### 요구사항
- [ ] 로그인 후 `mustChangePassword === true` 확인
- [ ] 비밀번호 변경 페이지로 강제 리다이렉트
- [ ] 페이지에서 나갈 수 없도록 구현 (백 버튼 비활성화)
- [ ] 비밀번호 변경 폼
  - 현재 임시 비밀번호 입력
  - 새 비밀번호 입력
  - 비밀번호 확인
  - 유효성 검증 (최소 8자, 특수문자 포함 등)
- [ ] 변경 완료 시 `PUT /api/admin/users/[id]` 호출
- [ ] 플래그 해제 후 대시보드로 리다이렉트
- [ ] 오류 처리 (기존 비밀번호 틀렸을 때 등)

#### 완료 조건
- [ ] 강제 비밀번호 변경 페이지 구현
- [ ] 요청사항 모두 충족
- [ ] 백엔드와 API 호출 테스트 완료
- [ ] UI/UX 일관성 검증

#### 기술 사항
- **API**: `PUT /api/admin/users/[id]`
  - Body: `{ currentPassword, newPassword }`
  - Response: 200 (success), 401 (wrong password)
- **라우트**: `/auth/change-password` (기존 또는 새로 생성)
- **기존 참고**: `app/login/page.tsx`

#### 종속성
- 없음 (독립적)

---

### [FE-ORG-001] /org 페이지 — Company CRUD UI 추가

**담당**: Frontend Role
**우선순위**: 🟠 높음 (배포 블로커)
**난이도**: 🟡 중간 (3-4일)
**상태**: 🔴 오픈

#### 배경
- Company 생성 API (`POST /api/org/companies`) 이미 구현됨
- Company 편집/삭제 API (`PUT|DELETE /api/org/companies/[id]`) 대기 중
- 현재 조직도 페이지에는 Company를 생성할 UI가 없음
- 관리자가 새로운 회사(법인)를 만들 수 없는 상황

#### 요구사항
- [ ] 조직도 페이지 상단에 "새 회사 생성" 버튼 추가
  - 클릭 시 모달 표시

- [ ] 회사 생성 모달
  ```
  ┌──────────────────────────┐
  │ 새 회사 생성              │
  ├──────────────────────────┤
  │ 회사명: [____________]   │
  │ (max 200자)              │
  │                          │
  │ [취소]    [생성]          │
  └──────────────────────────┘
  ```
  - 회사명 입력 필드 (필수, max 200자)
  - 취소 버튼
  - 생성 버튼
  - 로딩 상태 처리
  - 에러 메시지 표시 (중복 등)

- [ ] 회사 카드에 수정 버튼 추가
  ```
  ┌────────────────────┐
  │ 회사 1             │
  │ [✏️] [🗑️]         │ ← 수정, 삭제 버튼
  │                    │
  │ ├─ 부서 A          │
  │ ├─ 부서 B          │
  └────────────────────┘
  ```
  - 아이콘 버튼 또는 텍스트 버튼
  - 호버 시 색상 변경

- [ ] 회사 편집 모달
  ```
  ┌──────────────────────────┐
  │ 회사 정보 수정            │
  ├──────────────────────────┤
  │ 회사명: [____________]   │
  │                          │
  │ [취소]    [저장]          │
  └──────────────────────────┘
  ```
  - 회사명 수정
  - 저장 버튼
  - 에러 처리

- [ ] 회사 삭제 모달
  ```
  ┌──────────────────────────────┐
  │ 회사 삭제                     │
  ├──────────────────────────────┤
  │ "홍길동회사"를 삭제하시면:  │
  │                              │
  │ ⚠️ 소속 부서 5개             │
  │ ⚠️ 영향 조직원 12명          │
  │                              │
  │ 계속 진행하려면 다음을       │
  │ 입력하세요:                  │
  │ "삭제하겠습니다"             │
  │ [_________________]          │
  │                              │
  │ [취소]    [삭제]              │
  └──────────────────────────────┘
  ```
  - 회사명 표시
  - 영향 범위 표시 (부서 수, 조직원 수)
  - 확인 텍스트 입력 필드
  - 정확히 입력해야만 삭제 버튼 활성화
  - 로딩 상태

#### 완료 조건
- [ ] 생성/수정/삭제 모달 모두 구현
- [ ] API 호출 성공 및 에러 처리
- [ ] 모달 표시/숨김 애니메이션 (부드러운 전환)
- [ ] 토스트 알림 (성공/실패)
- [ ] 삭제 후 페이지 새로고침 또는 리스트 업데이트
- [ ] 모바일 반응형 검증

#### 기술 사항
- **라우트**: `/org`
- **컴포넌트**:
  - `OrgTree` 또는 `OrgPage` (기존)
  - `CompanyCreateModal` (새로)
  - `CompanyEditModal` (새로)
  - `CompanyDeleteModal` (새로)
- **API 호출**:
  - `POST /api/org/companies`
  - `PUT /api/org/companies/[id]`
  - `DELETE /api/org/companies/[id]`
  - `GET /api/org/companies/[id]/delete-preview` (삭제 영향 범위)
- **상태 관리**: React useState (모달 열기/닫기)
- **에러 처리**:
  - 409 Conflict (중복 회사명, 부서 있을 때 삭제 시도)
  - 400 Bad Request (유효성 실패)

#### 참고
- 기존 OrgUnit 수정/삭제 UI 참고 (`app/org/org-tree.tsx`)
- 삭제 확인 문구: "삭제하겠습니다" (정확히 일치해야 함)

#### 종속성
- BE-ORG-001, BE-ORG-002 (API 구현 필요)

---

## ⚙️ BACKEND 티켓

### [BE-ORG-001] PUT /api/org/companies/[id] — 회사 이름 수정

**담당**: Backend Role
**우선순위**: 🟠 높음 (배포 블로커)
**난이도**: 🟢 낮음 (1일)
**상태**: 🔴 오픈

#### 배경
- POST /api/org/companies (회사 생성) 이미 구현됨
- PUT /api/org/companies/[id] (회사 수정) 아직 구현 안 됨
- FE-ORG-001에서 필요함

#### 요구사항
- [ ] 라우트 생성: `PUT /api/org/companies/[id]`
- [ ] 요청 바디:
  ```json
  { "name": "신 회사명" }
  ```
- [ ] 유효성 검증
  - name은 필수 (vStrReq)
  - name의 최대 길이 200자
  - 공백만 있는 문자열 거부

- [ ] 중복 검증
  - 다른 회사와 이름 중복 시 409 Conflict
  - 에러 메시지: "이미 존재하는 회사명입니다."

- [ ] 응답
  - 200 OK
  - Body: `{ id, name, updatedAt }`

- [ ] AuditLog 기록
  - entityType: "ORG_COMPANY"
  - action: "UPDATED"
  - details: `{ name: "신 이름" }`

- [ ] 권한 검증
  - ADMIN만 가능
  - 아니면 403 Forbidden

#### 완료 조건
- [ ] 라우트 구현 완료
- [ ] 요구사항 모두 충족
- [ ] AuditLog 정상 기록
- [ ] 테스트 완료 (정상 케이스, 에러 케이스)

#### 기술 사항
- **파일**: `app/api/org/companies/[id]/route.ts` (새로 생성)
- **메서드**: PUT
- **라이브러리**:
  - `vStrReq` (lib/validation.ts)
  - `handleValidationError`, `handlePrismaError` (lib/validation.ts)
  - `writeAuditLog` (lib/audit-log.ts)
- **DB**:
  - `prisma.orgCompany.update()`
  - `prisma.auditLog.create()`

#### 참고
- 기존 POST /api/org/companies 코드 참고
- 기존 PUT /api/licenses/[id] 패턴 참고

#### 종속성
- 없음 (독립적)

---

### [BE-ORG-002] DELETE /api/org/companies/[id] — 회사 삭제

**담당**: Backend Role
**우선순위**: 🟠 높음 (배포 블로커)
**난이도**: 🟢 낮음 (1일)
**상태**: 🔴 오픈

#### 배경
- Company 삭제 API 아직 구현 안 됨
- FE-ORG-001에서 필요함
- 회사에 소속된 부서가 있으면 삭제 불가능해야 함 (FK 제약)

#### 요구사항
- [ ] 라우트 생성: `DELETE /api/org/companies/[id]`
- [ ] 삭제 전 유효성 검증
  - 회사에 소속된 OrgUnit이 있는지 확인
  - 있으면 409 Conflict
  - 에러 메시지: "소속 부서가 있어 삭제할 수 없습니다."

- [ ] 삭제 전 영향 범위 조회
  - 소속 OrgUnit 개수
  - 영향 Employee 수
  - (선택) 미리보기 엔드포인트도 추가 가능

- [ ] 소프트 삭제 또는 하드 삭제
  - 기존 설계에 따라 결정
  - AuditLog는 반드시 기록

- [ ] AuditLog 기록
  - entityType: "ORG_COMPANY"
  - action: "DELETED"
  - details: `{ name: "삭제된 회사명" }`

- [ ] 응답
  - 200 OK
  - Body: `{ message: "회사가 삭제되었습니다." }`
  - 또는 409 Conflict
  - Body: `{ error: "소속 부서가 있어 삭제할 수 없습니다." }`

- [ ] 권한 검증
  - ADMIN만 가능
  - 403 Forbidden

#### 완료 조건
- [ ] 라우트 구현 완료
- [ ] FK 제약 검증 및 에러 처리
- [ ] AuditLog 정상 기록
- [ ] 테스트 완료

#### 기술 사항
- **파일**: `app/api/org/companies/[id]/route.ts` (PUT과 함께 추가)
- **메서드**: DELETE
- **DB 쿼리**:
  ```typescript
  // 1. OrgUnit 확인
  const childUnits = await prisma.orgUnit.findMany({
    where: { companyId: id }
  });
  if (childUnits.length > 0) {
    return 409 conflict
  }

  // 2. 삭제
  await prisma.orgCompany.delete({
    where: { id }
  });

  // 3. AuditLog
  await writeAuditLog(...)
  ```

#### 참고
- GET /api/org/units/[id]/delete-preview 로직 참고 (OrgUnit 삭제 미리보기)

#### 종속성
- 없음 (독립적)

---

## 🔧 DEVOPS 티켓

### [OPS-010] deploy.sh / docker-compose.yml — SQLite 볼륨 제거

**담당**: DevOps Role
**우선순위**: 🟠 높음 (배포 블로커)
**난이도**: 🟡 중간 (1-2일)
**상태**: 🔴 오픈

#### 배경
- Supabase PostgreSQL로 전환 완료
- 기존 SQLite 설정 제거 필요
- Docker 배포 스크립트 업데이트 필수

#### 요구사항
- [ ] `docker-compose.yml` 또는 `deploy.sh` 검토
- [ ] 다음 항목 제거
  - `-v /home/ssm-user/license-manager/data/dev.db:/app/dev.db` (볼륨 마운트)
  - `DATABASE_URL=file:/app/dev.db` (환경변수)

- [ ] 추가 항목
  - `DATABASE_URL=postgresql://...` 환경변수 설정 방식 확인
  - EC2 SSM Parameter Store 또는 .env 파일에서 읽는 방식 검증

- [ ] 문서화
  - deploy 과정 정리
  - 필요한 환경변수 목록 (.env.example 참고)

#### 완료 조건
- [ ] SQLite 볼륨 제거 완료
- [ ] PostgreSQL 연결 문자열 정상 설정
- [ ] 테스트 환경에서 정상 작동 확인

#### 참고 파일
- `deploy.ps1` (Windows PowerShell)
- `.env.example` (환경변수 목록)
- `dockerfile`
- `docker-compose.yml`

#### 종속성
- OPS-011 (.env.example 생성)

---

### [OPS-011] .env.example 생성

**담당**: DevOps Role
**우선순위**: 🟠 높음 (배포 블로커)
**난이도**: 🟢 낮음 (0.5일)
**상태**: 🔴 오픈

#### 배경
- 배포 시 필요한 환경변수 목록 문서화 필요
- 개발자, DevOps가 참고할 수 있도록

#### 요구사항
- [ ] `프로젝트 루트/.env.example` 생성
- [ ] 다음 변수 포함 (실제 값 제외):
  ```
  # Database
  DATABASE_URL=postgresql://user:password@host:5432/database_name

  # Cron & Batch
  CRON_SECRET=your-secret-key-here

  # Slack Integration
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

  # Email (SMTP)
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  SMTP_FROM=noreply@company.com
  SMTP_SECURE=false

  # Cookie Security
  SECURE_COOKIE=true

  # Node Environment
  NODE_ENV=production
  ```

- [ ] 주석 추가 (각 변수의 의미 설명)

#### 완료 조건
- [ ] 파일 생성 완료
- [ ] Git에 커밋됨 (실제 값은 .gitignore에 포함)
- [ ] README에서 참고 가능하도록 문서화

#### 종속성
- 없음 (독립적)

---

### [OPS-001] dockerfile — 비root USER 지시문 추가

**담당**: DevOps Role
**우선순위**: 🟡 중간
**난이도**: 🟢 낮음 (0.5일)
**상태**: 🔴 오픈

#### 배경
- 보안 개선
- 컨테이너가 root로 실행되지 않도록

#### 요구사항
- [ ] dockerfile 검토
- [ ] 다음과 같은 지시문 추가:
  ```dockerfile
  # Create non-root user
  RUN useradd -m -u 1001 appuser

  # Switch to non-root user
  USER appuser
  ```
- [ ] 또는 기존 패턴 참고 (Alpine 등)

#### 완료 조건
- [ ] 비root USER 설정 완료
- [ ] 테스트 환경에서 정상 작동
- [ ] 기존 앱 기능에 영향 없음

#### 참고
- 기존 dockerfile 코드 검토
- Node.js 기반 Docker 보안 best practice

#### 종속성
- 없음 (독립적)

---

### [OPS-002] .dockerignore 점검

**담당**: DevOps Role
**우선순위**: 🟡 중간
**난이도**: 🟢 낮음 (0.5일)
**상태**: 🔴 오픈

#### 배경
- 불필요한 파일을 컨테이너 빌드에 포함하지 않도록

#### 요구사항
- [ ] `.dockerignore` 파일 존재 확인
- [ ] 다음 항목 포함 확인:
  ```
  .env
  .env.local
  dev.db*
  *.zip
  .git
  .gitignore
  node_modules (optional - build 단계에서만 필요)
  .next (optional - production 빌드 시)
  .DS_Store
  ```

- [ ] 기존 파일 검토 및 추가/제거

#### 완료 조건
- [ ] .dockerignore 파일 검증 완료
- [ ] 불필요한 파일 제외 확인
- [ ] 이미지 크기 최적화 확인 (가능하면)

#### 종속성
- 없음 (독립적)

---

## 📋 종합 테이블

| 티켓 | Role | 우선순위 | 난이도 | 상태 | 예상 기간 |
|------|------|---------|--------|------|----------|
| FE-001 | Frontend | 🟠 높음 | 🟢 낮음 | 🔴 오픈 | 1-2일 |
| FE-ORG-001 | Frontend | 🟠 높음 | 🟡 중간 | 🔴 오픈 | 3-4일 |
| BE-ORG-001 | Backend | 🟠 높음 | 🟢 낮음 | 🔴 오픈 | 1일 |
| BE-ORG-002 | Backend | 🟠 높음 | 🟢 낮음 | 🔴 오픈 | 1일 |
| OPS-010 | DevOps | 🟠 높음 | 🟡 중간 | 🔴 오픈 | 1-2일 |
| OPS-011 | DevOps | 🟠 높음 | 🟢 낮음 | 🔴 오픈 | 0.5일 |
| OPS-001 | DevOps | 🟡 중간 | 🟢 낮음 | 🔴 오픈 | 0.5일 |
| OPS-002 | DevOps | 🟡 중간 | 🟢 낮음 | 🔴 오픈 | 0.5일 |

**총 예상 기간**: 8-12일 (병렬 작업 시 4-6일)

---

## 🎯 진행 순서 (권장)

### Day 1-2: Backend 우선
1. BE-ORG-001 구현
2. BE-ORG-002 구현
→ Frontend가 API 호출 가능하도록

### Day 2-3: DevOps 병렬
1. OPS-011 (.env.example 생성)
2. OPS-010 (SQLite 제거)
3. OPS-001, OPS-002 (보안 개선)

### Day 3-5: Frontend 병렬
1. FE-001 (강제 비밀번호 변경)
2. FE-ORG-001 (Company CRUD UI)
→ BE-ORG-001/002 완료 후 시작

### Day 6+: 통합 테스트 & QA
- 전체 flow 테스트
- 배포 준비

---

## ✅ 정의된 완료 기준

모든 티켓이 완료되어야:
- ✅ 로그인 → 비밀번호 변경 → 대시보드 flow 정상
- ✅ 조직도에서 Company 생성/수정/삭제 정상
- ✅ Docker 배포 스크립트 정상
- ✅ 모든 API 호출 성공
- ✅ 에러 처리 및 로그 정상
- ✅ 배포 가능 상태

---

**이 티켓들이 모두 완료되면 프로덕션 배포 가능합니다.**

각 Role은 할당된 티켓을 우선순위대로 진행하면 됩니다. 🚀
