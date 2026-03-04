# API 스펙 (계약서)

> 기획 세션(/project:planning)에서 정의한다.
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

## 조직원 (Employees)

### GET /api/employees
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
      "orgId": 1,
      "subOrgId": null,
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
    "orgId": 1,
    "subOrgId": null
  }
  ```
- 응답 201: 생성된 Employee
- 비고: 기본 그룹(isDefault=true)에 속한 라이선스 자동 할당

### GET /api/employees/[id]
- 응답 200: Employee 상세 (assignments 포함)
- 응답 404: `{ error: "Not found" }`

### PUT /api/employees/[id]
- 요청: `{ name, department, email }` (기본 정보 수정)
- 응답 200: 수정된 Employee

### PATCH /api/employees/[id]
- 요청: `{ companyId, orgId, subOrgId, title }` (조직 정보 수정)
- 응답 200: 수정된 Employee

### DELETE /api/employees/[id]
- 응답 200: `{ success: true }`
- 비고: 관련 Assignment 이력 정리 후 삭제

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
          "children": []
        }
      ]
    }
  ]
  ```

### POST /api/org/companies
- 요청: `{ name: string }`
- 응답 201: 생성된 OrgCompany

---

## 사용자 관리 (Admin)

> ADMIN 역할만 접근 가능

### GET /api/admin/users
- 응답 200: `User[]` (password 제외)

### POST /api/admin/users
- 요청: `{ username: string, password: string, role: "ADMIN | USER" }`
- 응답 201: 생성된 User (password 제외)

### PUT /api/admin/users/[id]
- 요청: `{ isActive: boolean }` 또는 `{ password: string }` 등
- 응답 200: 수정된 User

---

## 미정의 / 확인 필요 항목

| 엔드포인트 | 상태 | 비고 |
|---|---|---|
| `GET /api/org/units` | ❓ 확인 필요 | 구현 여부 미확인 |
| `POST /api/org/units` | ❌ 미구현 | OrgUnit 생성 API 없음 |
| `PUT /api/org/units/[id]` | ❌ 미구현 | OrgUnit 수정 API 없음 |
| `DELETE /api/org/units/[id]` | ❌ 미구현 | OrgUnit 삭제 API 없음 |
| `GET /api/history` | ❓ 확인 필요 | AuditLog 조회 API 여부 |
| `POST /api/assignments` | ➡️ Server Action | REST API 없이 서버 액션으로 처리 |
