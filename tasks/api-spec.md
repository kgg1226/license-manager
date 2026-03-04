# API 스펙 (계약서)

> 기획 세션(/planning)에서 정의한다.
> 프론트엔드와 백엔드 세션은 이 스펙을 기준으로 개발한다.
> 스펙 변경이 필요하면 tasks/feedback/에 요청을 작성한다.

---

## 인증

### POST /api/auth/login
- 요청: `{ username: string, password: string }`
- 응답 200: `{ user: { id, username, role } }`
- 응답 401: `{ error: "Invalid credentials" }`

### POST /api/auth/logout
- 요청: (없음, 세션 쿠키로 식별)
- 응답 200: `{ success: true }`

### GET /api/auth/session
- 요청: (없음, 세션 쿠키로 식별)
- 응답 200: `{ authenticated: true, user: { id, username, role } }`
- 응답 200: `{ authenticated: false }`

---

## 라이선스 (Licenses)

### GET /api/licenses
- 요청: (없음)
- 응답 200: `License[]`
  ```json
  [
    {
      "id": 1,
      "name": "string",
      "key": "string | null",
      "licenseType": "KEY_BASED | VOLUME | NO_KEY",
      "totalQuantity": 10,
      "price": 100.0,
      "purchaseDate": "ISO8601",
      "expiryDate": "ISO8601 | null",
      "noticePeriodDays": 30,
      "adminName": "string | null",
      "description": "string | null",
      "paymentCycle": "MONTHLY | YEARLY | null",
      "unitPrice": 10.0,
      "currency": "KRW | USD | EUR | JPY | GBP | CNY",
      "exchangeRate": 1.0,
      "isVatIncluded": false,
      "totalAmountForeign": null,
      "totalAmountKRW": null,
      "assignedCount": 3,
      "remainingCount": 7,
      "unregisteredKeyCount": 2
    }
  ]
  ```

### POST /api/licenses
- 요청:
  ```json
  {
    "name": "string",
    "licenseType": "KEY_BASED | VOLUME | NO_KEY",
    "totalQuantity": 10,
    "key": "string | null",
    "price": 100.0,
    "purchaseDate": "ISO8601",
    "expiryDate": "ISO8601 | null",
    "noticePeriodDays": 30,
    "adminName": "string | null",
    "description": "string | null",
    "paymentCycle": "MONTHLY | YEARLY | null",
    "unitPrice": 10.0,
    "currency": "KRW",
    "exchangeRate": 1.0,
    "isVatIncluded": false
  }
  ```
- 응답 201: `{ id, name, ... }` (생성된 License)
- 응답 400: `{ error: string }`
- 비고: KEY_BASED 타입 생성 시 `totalQuantity`개의 LicenseSeat 자동 생성

### GET /api/licenses/[id]
- 응답 200: License 상세 (assignments 포함)
- 응답 404: `{ error: "Not found" }`

### PUT /api/licenses/[id]
- 요청: POST와 동일 구조 (부분 업데이트 가능)
- 응답 200: 수정된 License
- 응답 400: `{ error: string }` (유형 변경 시 활성 배정 존재하면 거부)
- 응답 404: `{ error: "Not found" }`

### DELETE /api/licenses/[id]
- 응답 200: `{ success: true }`
- 비고: 관련 Assignment, LicenseSeat, AssignmentHistory 함께 삭제

---

## 구성원 (Employees)

> UI/도메인 용어: "구성원". API 경로는 `/api/employees` 유지 (하위호환).

### GET /api/employees
- 쿼리 파라미터: `orgUnitId?: number`, `status?: "ACTIVE|OFFBOARDING"`, `unassigned?: boolean`
- 응답 200: `Employee[]`
  ```json
  [
    {
      "id": 1,
      "name": "string",
      "department": "string",
      "email": "string | null",
      "title": "string | null",
      "companyId": 1,
      "orgUnitId": 1,
      "status": "ACTIVE",
      "offboardingUntil": null,
      "activeAssignmentCount": 2
    }
  ]
  ```

### POST /api/employees
- 요청:
  ```json
  {
    "name": "string",
    "department": "string",
    "email": "string | null",
    "title": "string | null",
    "companyId": 1,
    "orgUnitId": null
  }
  ```
- 응답 201: 생성된 Employee
- 비고: 기본 그룹(isDefault=true)에 속한 라이선스 자동 할당

### GET /api/employees/[id]
- 응답 200: Employee 상세 (assignments 포함)
- 응답 404: `{ error: "Not found" }`

### PUT /api/employees/[id]
- 요청: `{ name, department, email, title }` (기본 정보 수정)
- 응답 200: 수정된 Employee

### PATCH /api/employees/[id]
- 요청: `{ companyId?, orgUnitId?, title? }` (조직 배치 변경 — 드래그&드롭 이동 포함)
- 동작: 이동 시 AuditLog 기록 (누가, 언제, 이전 orgUnitId → 새 orgUnitId)
- 응답 200: 수정된 Employee

### POST /api/employees/[id]/offboard
- 퇴사 처리 (OFFBOARDING 상태로 변경, 7일 유예 시작)
- 동작:
  1. status = OFFBOARDING, offboardingUntil = now + 7일
  2. AuditLog: `MEMBER_OFFBOARD` 기록
- 응답 200: `{ success: true, offboardingUntil: "ISO8601" }`

### DELETE /api/employees/[id]
- 즉시 삭제 (ADMIN 전용, 유예 없이)
- 동작:
  1. 관련 Assignment 이력 정리
  2. 본 레코드 삭제
  3. AuditLog Tombstone 기록 (email, id, 삭제자, 삭제 시각, 사유)
- 응답 200: `{ success: true }`

---

## 할당 (Assignments)

### GET /api/assignments
- 쿼리 파라미터: `licenseId`, `employeeId` (선택)
- 응답 200: `Assignment[]`
  ```json
  [
    {
      "id": 1,
      "licenseId": 1,
      "employeeId": 1,
      "seatId": null,
      "assignedDate": "ISO8601",
      "returnedDate": "ISO8601 | null",
      "reason": "string | null"
    }
  ]
  ```

### PUT /api/assignments/[id]
- 요청: `{ returnedDate: "ISO8601", reason: "string | null" }` (반납 처리)
- 응답 200: 수정된 Assignment

### DELETE /api/assignments/[id]
- 응답 200: `{ success: true }`

> **비고**: 신규 할당 생성은 Server Action(`/lib/assignment-actions.ts`)으로 처리

---

## 시트 (Seats)

### PATCH /api/seats/[id]
- 요청: `{ key: "string" }` (시트 키 등록/수정)
- 응답 200: 수정된 LicenseSeat
- 응답 409: `{ error: "Key already exists" }` (중복 키)

### GET /api/seats/check-key
- 쿼리 파라미터: `key: string`, `excludeSeatId?: number`
- 응답 200: `{ exists: boolean }`

---

## 라이선스 그룹 (Groups)

### GET /api/groups
- 응답 200: `LicenseGroup[]` (members 포함)

### POST /api/groups
- 요청:
  ```json
  {
    "name": "string",
    "description": "string | null",
    "isDefault": false,
    "licenseIds": [1, 2]
  }
  ```
- 응답 201: 생성된 LicenseGroup

### GET /api/groups/[id]
- 응답 200: LicenseGroup 상세 (members 포함)

### PUT /api/groups/[id]
- 요청: `{ name, description, isDefault }`
- 응답 200: 수정된 LicenseGroup

### DELETE /api/groups/[id]
- 응답 200: `{ success: true }`
- 비고: 기존 배정(Assignment)은 유지됨

### POST /api/groups/[id]/members
- 요청: `{ licenseId: number }`
- 응답 201: 생성된 LicenseGroupMember

### DELETE /api/groups/[id]/members
- 요청: `{ licenseId: number }`
- 응답 200: `{ success: true }`

---

## 조직 (Org)

### GET /api/org/companies
- 응답 200: `OrgCompany[]` (하위 OrgUnit 계층 포함)
  ```json
  [
    {
      "id": 1,
      "name": "string",
      "orgs": [
        {
          "id": 1,
          "name": "string",
          "parentId": null,
          "sortOrder": 0,
          "children": [],
          "memberCount": 3
        }
      ]
    }
  ]
  ```

### POST /api/org/companies
- 요청: `{ name: string }`
- 응답 201: 생성된 OrgCompany

---

## 조직 단위 CRUD (OrgUnit)

### GET /api/org/units
- 쿼리 파라미터: `companyId?: number`
- 응답 200: `OrgUnit[]` (전체 트리, children 중첩 포함)

### POST /api/org/units
- 요청: `{ name: string, companyId: number, parentId?: number | null, sortOrder?: number }`
- 응답 201: 생성된 OrgUnit
- 응답 409: `{ error: "이미 존재하는 부서명입니다" }` (동일 회사 내 중복명)

### PUT /api/org/units/[id]
- 요청: `{ name?: string, parentId?: number | null, sortOrder?: number }`
- 응답 200: 수정된 OrgUnit
- 응답 409: `{ error: "이미 존재하는 부서명입니다" }`

### GET /api/org/units/[id]/delete-preview
- 삭제 전 영향 범위 미리보기
- 응답 200:
  ```json
  {
    "target": { "id": 1, "name": "string" },
    "descendants": [
      { "id": 2, "name": "string", "depth": 1 }
    ],
    "descendantCount": 5,
    "affectedMemberCount": 12
  }
  ```

### DELETE /api/org/units/[id]
- 요청 body: `{ confirm: "삭제하겠습니다" }` (정확히 일치해야 처리)
- 동작:
  1. 해당 OrgUnit + 모든 하위 OrgUnit cascade 삭제
  2. 삭제 트리 내 구성원 → `orgUnitId = null` (미소속으로 이동)
  3. AuditLog에 삭제자, 삭제 시각, 삭제된 트리 스냅샷, 영향 구성원 수 기록
- 응답 200: `{ success: true, affectedMemberCount: number }`
- 응답 400: `{ error: "확인 문구가 일치하지 않습니다" }`

---

## 라이선스 갱신 (Renewal)

### PUT /api/licenses/[id]/renewal-status
- 갱신 상태 변경
- 요청: `{ status: "BEFORE_RENEWAL | IN_PROGRESS | NOT_RENEWING | RENEWED", memo?: string }`
- 동작:
  1. License.renewalStatus 업데이트
  2. LicenseRenewalHistory 기록 (fromStatus, toStatus, actorId, memo)
  3. NOT_RENEWING으로 변경 시 → 만료일 도래 시 자동 아카이빙 대상으로 표시
- 응답 200: `{ success: true, renewalStatus: string }`

### GET /api/licenses/[id]/renewal-history
- 응답 200: `LicenseRenewalHistory[]` (최신순)

### PUT /api/licenses/[id]/renewal-date
- 갱신일 수동 설정 (override)
- 요청: `{ renewalDateManual: "ISO8601" | null }` (null이면 자동 계산으로 복원)
- 동작: 변경 이력을 LicenseRenewalHistory에 기록 (`memo: "갱신일 수동 변경"`)
- 응답 200: `{ renewalDate: "ISO8601" }`

### GET /api/licenses/[id]/owners
- 응답 200: `LicenseOwner[]` (userId 또는 orgUnitId)

### POST /api/licenses/[id]/owners
- 요청: `{ userId?: number, orgUnitId?: number }` (둘 중 하나만)
- 응답 201: 생성된 LicenseOwner

### DELETE /api/licenses/[id]/owners/[ownerId]
- 응답 200: `{ success: true }`

---

## 사용자 관리 (Admin)

> ADMIN 역할만 접근 가능

### GET /api/admin/users
- 응답 200: `User[]` (password 제외)

### POST /api/admin/users
- 요청: `{ username: string, password: string, role: "ADMIN | USER" }`
- 응답 201: 생성된 User (password 제외)

### PUT /api/admin/users/[id]
- 요청: `{ isActive?: boolean }` (활성/비활성 전환)
- 응답 200: 수정된 User

### DELETE /api/admin/users/[id]
- 응답 200: `{ success: true }`

### POST /api/admin/users/[id]/reset-password
- 관리자가 임시 비밀번호 발급 (직접 비밀번호 설정 금지)
- 응답 200: `{ tempPassword: string }` (이 응답 이후 재조회 불가)
- 동작:
  1. 임시 비밀번호 자동 생성 (12자 이상, 영문+숫자+특수문자)
  2. bcryptjs로 해시 후 저장
  3. 다음 로그인 시 비밀번호 변경 강제 플래그 설정 (`mustChangePassword = true`)
  4. AuditLog 기록: 누가(ADMIN userId) 누구의 비밀번호를 언제 리셋했는지
- 비고: ADMIN 역할만 가능. `mustChangePassword` 필드가 User 테이블에 필요 (→ db-changes에 추가)

---

## 미정의 / 확인 필요 항목

| 엔드포인트 | 상태 | 비고 |
|---|---|---|
| `GET /api/org/units` | 🆕 신규 정의됨 | 위 스펙 참조 |
| `POST /api/org/units` | 🆕 신규 정의됨 | 위 스펙 참조 |
| `PUT /api/org/units/[id]` | 🆕 신규 정의됨 | 위 스펙 참조 |
| `DELETE /api/org/units/[id]` | 🆕 신규 정의됨 | 위 스펙 참조 |
| `GET /api/history` | ❓ 확인 필요 | AuditLog 조회 REST API 여부 |
| `POST /api/assignments` | ➡️ Server Action | REST API 없이 서버 액션으로 처리 |
| 갱신 알림 스케줄러 | ❌ 미구현 | D-70/30/15/7 발송, 별도 스케줄러 또는 cron |
| OFFBOARDING 자동 삭제 배치 | ❌ 미구현 | 매일 실행, offboardingUntil 경과 구성원 삭제 |
| `mustChangePassword` 필드 | ❌ 미반영 | User 테이블에 추가 필요 (db-changes 반영 예정) |
