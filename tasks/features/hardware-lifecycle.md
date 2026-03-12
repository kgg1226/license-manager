# 하드웨어 자산 수명주기 + 감가상각 + 할당 이력

> 작성: 기획 세션 / 2026-03-12
> 상태: 확정

---

## 1. 배경

하드웨어 자산 중 PC(Laptop, Desktop)는 월별/연간 과금이 아닌 **내용연수 기반 감가상각**으로 비용을 관리한다.
또한 하드웨어 자산을 조직원에게 할당/회수하고, 그 이력을 추적할 수 있어야 한다.

---

## 2. 요구사항

### 2.1 PC 자산: 수명 주기 + 감가상각

**대상 deviceType**: `Laptop`, `Desktop`

| 항목 | 설명 |
|---|---|
| 내용연수 | 기본 5년 (변경 가능, HardwareDetail.usefulLifeYears) |
| 감가 방식 | **정액법** (Straight-line, 잔존가액 0원) |
| 취득가액 | Asset.cost (VAT 포함 금액) |
| 연 감가액 | `cost / usefulLifeYears` |
| 월 감가액 | `연 감가액 / 12` |
| 장부가액 | `cost - (연 감가액 × 경과연수)`, 최소 0 |
| 경과연수 | `(현재일 - purchaseDate) / 365` (소수점) |

**동작**:
- PC 자산 등록/수정 시 `monthlyCost`를 감가 월액으로 **자동 계산**하여 저장
- `billingCycle`은 `DEPRECIATION`으로 설정 (기존 MONTHLY/ANNUAL/ONE_TIME과 구분)
- 자산 상세 페이지에서 감가상각 정보 섹션 표시:
  - 취득가액, 내용연수, 연 감가액, 월 감가액, 경과연수, 현재 장부가액

**비 PC 하드웨어** (Server, Network, Mobile, Other):
- 기존 billingCycle 방식 유지 (MONTHLY/ANNUAL/ONE_TIME 선택)
- 단, `usefulLifeYears`는 모든 하드웨어에 표시 (참고 정보)

### 2.2 PC/Laptop 상세 사양 필드

**대상 deviceType**: `Laptop`, `Desktop`

HardwareDetail 모델에 장비 사양 필드를 추가한다:

| 필드 | 타입 | 설명 | 예시 |
|---|---|---|---|
| `cpu` | String? | CPU 모델명 | "Apple M4 Pro", "Intel i7-13700" |
| `ram` | String? | 메모리 용량 | "16GB", "32GB DDR5" |
| `storage` | String? | 저장장치 | "512GB SSD", "1TB NVMe" |
| `gpu` | String? | 그래픽카드 (선택) | "RTX 4060", "통합 GPU" |
| `displaySize` | String? | 화면 크기 (노트북) | "14인치", "16.2인치" |

> 모든 필드는 **선택(nullable)** — 입력하지 않아도 등록 가능.
> Server, Network 등 비PC 장비에도 cpu/ram/storage는 표시 가능 (UI에서 deviceType 무관하게 표시).

### 2.3 IP Address 필드 조건부 표시

| deviceType | ipAddress 표시 | macAddress 표시 |
|---|---|---|
| Laptop | ❌ | ❌ |
| Desktop | ❌ | ❌ |
| Mobile | ❌ | ❌ |
| **Server** | ✅ | ✅ |
| **Network** | ✅ | ✅ |
| Other | ❌ | ❌ |

> DB 스키마 변경 없음. **UI에서 deviceType 기반으로 표시/숨김** 처리.

### 2.3 하드웨어 자산 할당/회수

**현재 상태**: Asset 모델에 `assigneeId` (Employee FK)가 이미 존재. 단, 할당/회수 **이력**이 없음.

**변경**:
1. 새 테이블 `AssetAssignmentHistory` 추가 (할당/회수 이력 추적)
2. 할당 API: `POST /api/assets/[id]/assign`
3. 회수 API: `POST /api/assets/[id]/unassign`
4. 이력 조회 API: `GET /api/assets/[id]/assignment-history`
5. 할당 시 Asset.status → `IN_USE`, 회수 시 → `IN_STOCK`

---

## 3. DB 스키마 변경

### 3.1 신규 테이블: AssetAssignmentHistory

```prisma
model AssetAssignmentHistory {
  id           Int       @id @default(autoincrement())
  assetId      Int
  employeeId   Int
  action       String    // ASSIGNED | UNASSIGNED
  reason       String?
  performedBy  Int?      // userId (누가 할당/회수했는지)
  createdAt    DateTime  @default(now())
  asset        Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)
  employee     Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@index([employeeId])
}
```

### 3.2 Asset 모델 변경

- `assignmentHistories AssetAssignmentHistory[]` 관계 추가
- 기존 필드 변경 없음

### 3.3 Employee 모델 변경

- `assetAssignmentHistories AssetAssignmentHistory[]` 관계 추가

---

## 4. API 스펙

### 4.1 POST /api/assets/[id]/assign

하드웨어 자산을 조직원에게 할당.

**요청:**
```json
{
  "employeeId": 1,
  "reason": "신규 입사 장비 지급"
}
```

**동작:**
1. Asset 존재 확인 (404)
2. 이미 할당된 경우 에러 (409: "이미 다른 조직원에게 할당된 자산입니다")
3. Employee 존재 확인 (404)
4. Asset.assigneeId = employeeId, Asset.status = IN_USE
5. AssetAssignmentHistory 기록 (action: ASSIGNED)
6. AuditLog 기록

**응답 200:**
```json
{
  "success": true,
  "asset": { "id": 1, "assigneeId": 1, "status": "IN_USE" },
  "history": { "id": 1, "action": "ASSIGNED", "employeeId": 1 }
}
```

### 4.2 POST /api/assets/[id]/unassign

할당 해제 (회수).

**요청:**
```json
{
  "reason": "퇴사로 인한 장비 회수"
}
```

**동작:**
1. Asset 존재 확인 (404)
2. 현재 할당자 없으면 에러 (400: "할당된 조직원이 없습니다")
3. 이전 assigneeId 기록
4. Asset.assigneeId = null, Asset.status = IN_STOCK
5. AssetAssignmentHistory 기록 (action: UNASSIGNED, employeeId = 이전 할당자)
6. AuditLog 기록

**응답 200:**
```json
{
  "success": true,
  "asset": { "id": 1, "assigneeId": null, "status": "IN_STOCK" },
  "history": { "id": 2, "action": "UNASSIGNED", "employeeId": 1 }
}
```

### 4.3 GET /api/assets/[id]/assignment-history

할당/회수 이력 조회.

**응답 200:**
```json
[
  {
    "id": 2,
    "action": "UNASSIGNED",
    "reason": "퇴사로 인한 장비 회수",
    "createdAt": "2026-03-12T10:00:00Z",
    "employee": { "id": 1, "name": "홍길동", "department": "개발팀" },
    "performedBy": { "id": 1, "username": "admin" }
  },
  {
    "id": 1,
    "action": "ASSIGNED",
    "reason": "신규 입사 장비 지급",
    "createdAt": "2026-01-15T09:00:00Z",
    "employee": { "id": 1, "name": "홍길동", "department": "개발팀" },
    "performedBy": { "id": 1, "username": "admin" }
  }
]
```

### 4.4 POST /api/assets (수정 — PC 감가 자동계산)

기존 자산 등록 API에 PC 감가 자동계산 로직 추가.

**추가 동작** (type=HARDWARE, hardwareDetail.deviceType in [Laptop, Desktop]):
1. `billingCycle`을 `DEPRECIATION`으로 강제 설정
2. `monthlyCost` = `cost / usefulLifeYears / 12` 자동 계산
3. `cost`가 null이면 `monthlyCost`도 null

### 4.5 PUT /api/assets/[id] (수정 — PC 감가 자동계산)

기존 자산 수정 API에 동일 로직 추가. `cost`, `usefulLifeYears` 변경 시 `monthlyCost` 재계산.

---

## 5. UI 변경

### 5.1 하드웨어 등록/수정 폼

**deviceType 선택에 따른 동적 필드:**

| 필드 | Laptop/Desktop | Server/Network | Mobile | Other |
|---|---|---|---|---|
| manufacturer | ✅ | ✅ | ✅ | ✅ |
| model | ✅ | ✅ | ✅ | ✅ |
| serialNumber | ✅ | ✅ | ✅ | ✅ |
| **cpu** | ✅ | ✅ | ❌ | ❌ |
| **ram** | ✅ | ✅ | ❌ | ❌ |
| **storage** | ✅ | ✅ | ❌ | ❌ |
| **gpu** | ✅ | ❌ | ❌ | ❌ |
| **displaySize** | ✅ (노트북) | ❌ | ❌ | ❌ |
| hostname | ✅ | ✅ | ❌ | ❌ |
| ipAddress | ❌ | ✅ | ❌ | ❌ |
| macAddress | ❌ | ✅ | ❌ | ❌ |
| os / osVersion | ✅ | ✅ | ✅ | ❌ |
| location | ✅ | ✅ | ❌ | ✅ |
| usefulLifeYears | ✅ (입력) | ✅ (참고) | ✅ (참고) | ✅ (참고) |
| billingCycle | ❌ (자동: 감가) | ✅ (선택) | ✅ (선택) | ✅ (선택) |
| cost (취득가/VAT포함) | ✅ (필수) | ✅ | ✅ | ✅ |

**PC(Laptop/Desktop) 선택 시 UI:**
- billingCycle 필드 숨김, 대신 "감가상각 (정액법)" 라벨 표시
- 취득가 입력 시 실시간 미리보기: 연 감가액, 월 감가액 표시

### 5.2 하드웨어 상세 페이지

**감가상각 정보 카드** (deviceType = Laptop/Desktop):
```
┌─ 감가상각 정보 ──────────────────┐
│ 취득가액 (VAT 포함)  ₩2,400,000  │
│ 내용연수             5년         │
│ 연 감가액            ₩480,000    │
│ 월 감가액            ₩40,000     │
│ 경과기간             1년 3개월   │
│ 현재 장부가액        ₩1,800,000  │
│ ████████░░░░░░░░░░░░ 25% 감가    │
└──────────────────────────────────┘
```

**할당 정보 섹션**:
- 현재 할당자: 이름, 부서, 할당일
- [할당] / [회수] 버튼
- 할당 이력 테이블 (최신순)

### 5.3 하드웨어 목록 페이지

- 할당 상태 컬럼 추가: 할당자 이름 또는 "미할당" 표시
- 필터 추가: 할당 상태 (전체/할당됨/미할당)

### 5.4 자산 목록 정렬 기능 (전체 자산 공통)

**모든 자산 목록 페이지**에서 테이블 컬럼 헤더 클릭 시 해당 필드 기준 오름차순/내림차순 정렬.

**정렬 가능 필드:**

| 컬럼 | 정렬 기준 | 비고 |
|---|---|---|
| 자산명 | `name` (가나다순) | |
| 유형 | `type` (enum 순서) | |
| 상태 | `status` (enum 순서) | |
| 비용 | `monthlyCost` (숫자) | null은 마지막 |
| 취득일 | `purchaseDate` (날짜) | |
| 만료일 | `expiryDate` (날짜) | null은 마지막 |
| 할당자 | `assignee.name` (가나다순) | 미할당은 마지막 |
| 제조사 | `hardwareDetail.manufacturer` | 하드웨어만 |
| 장치유형 | `hardwareDetail.deviceType` | 하드웨어만 |

**구현 방식:**
- **클라이언트 정렬** (데이터 < 1000건) — 초기 로드 후 JS로 정렬
- 컬럼 헤더 클릭: 1회 → 오름차순(▲), 2회 → 내림차순(▼), 3회 → 기본 정렬 해제
- 현재 정렬 상태를 URL 쿼리(`?sort=name&order=asc`)에 반영 (페이지 새로고침 유지)

---

## 6. 자산 상태 전환 규칙

### 6.1 상태 값 정의

| 상태 | 라벨 | 설명 |
|---|---|---|
| `IN_STOCK` | 재고 | 미할당 상태 (구매 직후, 회수 후) |
| `IN_USE` | 사용 중 | 조직원에게 할당된 상태 |
| `INACTIVE` | 미사용 | 일시적으로 사용하지 않는 상태 |
| `UNUSABLE` | 불용 | 고장·노후 등으로 더 이상 사용 불가 |
| `PENDING_DISPOSAL` | 폐기 대상 | 폐기 절차 진행 대기 |
| `DISPOSED` | 폐기 완료 | 폐기 처리 완료 (최종 상태) |

### 6.2 상태 전환 다이어그램

```
  ┌──────────┐    할당     ┌──────────┐
  │ IN_STOCK │───────────→│  IN_USE   │
  └──────────┘    회수     └──────────┘
       │ ↑  ←──────────────────┘
       │ │
       ▼ │
  ┌──────────┐
  │ INACTIVE │
  └──────────┘
       │
       │  ※ IN_STOCK, IN_USE, INACTIVE 어디서든 가능
       ▼
  ┌──────────┐   자동 전환   ┌─────────────────┐   관리자 확인   ┌──────────┐
  │ UNUSABLE │─────────────→│ PENDING_DISPOSAL │──────────────→│ DISPOSED │
  └──────────┘              └─────────────────┘               └──────────┘
                                   ↑
                                   │ 자동 (남은 수명 < 1년)
                                   │ (PC 자산만)
```

### 6.3 전환 규칙

| 전환 | 트리거 | 권한 | 비고 |
|---|---|---|---|
| Any → `IN_USE` | 할당 API (`POST /assign`) | **ADMIN** | assigneeId 설정, 자동 전환 |
| `IN_USE` → `IN_STOCK` | 회수 API (`POST /unassign`) | **ADMIN** | assigneeId 제거, 자동 전환 |
| `IN_STOCK`/`IN_USE`/`INACTIVE` → `UNUSABLE` | 관리자 "불용 처리" 버튼 | **ADMIN** | 사유 입력 필수 |
| `UNUSABLE` → `PENDING_DISPOSAL` | **자동** | 시스템 | 불용 처리 시 즉시 PENDING_DISPOSAL로 전환 |
| Any PC자산 (남은 수명 < 1년) → `PENDING_DISPOSAL` | **자동** | 시스템 | 배치 또는 조회 시 판정 |
| `PENDING_DISPOSAL` → `DISPOSED` | 관리자 "폐기 완료" 버튼 | **ADMIN** | 사유 입력 필수, 최종 상태 |

> **핵심**: "불용 처리" 버튼 → UNUSABLE → 즉시 PENDING_DISPOSAL 자동 전환 (2단계를 1회 클릭으로)
> **핵심**: "폐기 완료" 버튼은 PENDING_DISPOSAL 상태에서만 노출

### 6.4 폐기 대상 자동 판정 (PC 자산)

**대상**: `deviceType` = Laptop / Desktop (감가상각 적용 자산)

**조건**: `purchaseDate + usefulLifeYears - 1년 < 현재일`
→ 즉, 남은 내용연수가 1년 미만이면 자동으로 `PENDING_DISPOSAL`

**실행 방식**:
- **방법 A (배치)**: `POST /api/cron/asset-disposal-check` — 매일 실행, 조건 충족 자산 일괄 PENDING_DISPOSAL
- **방법 B (조회 시)**: 자산 목록/상세 조회 시 남은 수명 계산하여 UI에 "폐기 대상" 배지 표시 + 상태 자동 업데이트

> 추천: **방법 A (배치)** — 상태 변경 시 AuditLog 기록이 명확하고, 조회 성능에 영향 없음

### 6.5 API 변경 — PATCH /api/assets/[id]/status

**기존**: `ACTIVE`, `INACTIVE`, `DISPOSED` 3가지만 허용
**변경**: 전체 AssetStatus enum + 전환 규칙 검증

**요청:**
```json
{
  "status": "UNUSABLE",
  "reason": "하드디스크 고장으로 수리 불가"
}
```

**동작:**
1. Asset 존재 확인 (404)
2. 전환 규칙 검증 (허용되지 않는 전환이면 400)
3. UNUSABLE로 변경 시 → PENDING_DISPOSAL로 자동 추가 전환
4. DISPOSED로 변경 시 → 현재 상태가 PENDING_DISPOSAL인지 확인 (아니면 400)
5. Asset.status 업데이트
6. AuditLog 기록 (이전 상태 → 새 상태, 사유)
7. 할당 중인 자산을 UNUSABLE로 변경 시 → 자동 회수 (assigneeId = null, AssetAssignmentHistory 기록)

**응답 200:**
```json
{
  "success": true,
  "asset": { "id": 1, "status": "PENDING_DISPOSAL" },
  "previousStatus": "IN_USE",
  "autoTransitions": ["UNUSABLE", "PENDING_DISPOSAL"]
}
```

**전환 허용 매트릭스:**

| 현재 \ 요청 | IN_STOCK | IN_USE | INACTIVE | UNUSABLE | PENDING_DISPOSAL | DISPOSED |
|---|---|---|---|---|---|---|
| IN_STOCK | — | assign | ✅ | ✅→PD | 배치만 | ✗ |
| IN_USE | unassign | — | ✅ | ✅→PD | 배치만 | ✗ |
| INACTIVE | ✅ | assign | — | ✅→PD | 배치만 | ✗ |
| UNUSABLE | ✗ | ✗ | ✗ | — | 자동 | ✗ |
| PENDING_DISPOSAL | ✗ | ✗ | ✗ | ✗ | — | ✅ |
| DISPOSED | ✗ | ✗ | ✗ | ✗ | ✗ | — |

> `✅→PD` = UNUSABLE 설정 즉시 PENDING_DISPOSAL로 자동 전환
> `assign`/`unassign` = 별도 API로 처리 (PATCH status가 아님)
> `배치만` = 남은 수명 < 1년 자동 판정 (수동 불가)

### 6.6 배치 API — POST /api/cron/asset-disposal-check

**동작:**
1. CRON_SECRET 헤더 검증
2. PC 자산 (deviceType = Laptop/Desktop) 중 상태가 IN_STOCK/IN_USE/INACTIVE인 자산 조회
3. 각 자산의 남은 내용연수 계산: `purchaseDate + usefulLifeYears * 365일 - 현재일`
4. 남은 일수 < 365일인 자산 → status = PENDING_DISPOSAL
5. AuditLog 기록 (actorType: SYSTEM)

**응답 200:**
```json
{
  "success": true,
  "checked": 50,
  "updated": 3,
  "assets": [
    { "id": 10, "name": "MacBook Pro #3", "remainingDays": 280 }
  ]
}
```

### 6.7 UI — 상태 전환 버튼

**자산 상세 페이지 상태 영역:**

```
┌─ 상태 관리 ──────────────────────────────────────┐
│                                                    │
│  현재 상태: [🟢 사용 중]                            │
│                                                    │
│  [불용 처리]          ← IN_STOCK/IN_USE/INACTIVE    │
│  [폐기 완료]          ← PENDING_DISPOSAL만 표시     │
│                                                    │
│  ※ 불용 처리 시 자동으로 폐기 대상으로 전환됩니다     │
└────────────────────────────────────────────────────┘
```

**버튼 표시 조건:**

| 버튼 | 표시 조건 | 권한 | 확인 모달 |
|---|---|---|---|
| 불용 처리 | status ∈ {IN_STOCK, IN_USE, INACTIVE} | ADMIN | 사유 입력 필수 + "불용 처리 시 폐기 대상으로 전환됩니다" 안내 |
| 폐기 완료 | status = PENDING_DISPOSAL | ADMIN | 사유 입력 필수 + "폐기 완료 후 되돌릴 수 없습니다" 경고 |

**상태 배지 색상:**

| 상태 | 배지 색상 |
|---|---|
| IN_STOCK | 회색 (gray) |
| IN_USE | 초록 (green) |
| INACTIVE | 노랑 (yellow) |
| UNUSABLE | 주황 (orange) |
| PENDING_DISPOSAL | 빨강 (red) |
| DISPOSED | 검정 (dark/gray-900) |

---

## 7. 작업 분해

### 백엔드 (role/backend)

| 티켓 | 내용 | 우선순위 |
|---|---|---|
| BE-HW-001 | `AssetAssignmentHistory` 모델 추가 (schema.prisma) | P1 |
| BE-HW-002 | `POST /api/assets/[id]/assign` 할당 API | P1 |
| BE-HW-003 | `POST /api/assets/[id]/unassign` 회수 API | P1 |
| BE-HW-004 | `GET /api/assets/[id]/assignment-history` 이력 조회 API | P1 |
| BE-HW-005 | `POST/PUT /api/assets` 감가 자동계산 로직 추가 | P2 |
| BE-HW-006 | `PATCH /api/assets/[id]/status` 상태 전환 규칙 적용 (전환 매트릭스 + 불용→폐기대상 자동전환) | P1 |
| BE-HW-007 | `POST /api/cron/asset-disposal-check` 폐기 대상 자동 판정 배치 | P2 |

### 프론트엔드 (role/frontend)

| 티켓 | 내용 | 우선순위 |
|---|---|---|
| FE-HW-001 | 하드웨어 등록/수정 폼 — deviceType 기반 조건부 필드 | P1 |
| FE-HW-002 | 하드웨어 상세 — 감가상각 정보 카드 | P2 |
| FE-HW-003 | 하드웨어 상세 — 할당/회수 UI + 이력 테이블 | P1 |
| FE-HW-004 | 하드웨어 목록 — 할당 상태 컬럼 + 필터 | P2 |
| FE-HW-006 | 하드웨어 상세 — 불용 처리 / 폐기 완료 버튼 + 확인 모달 | P1 |

---

## 7. 감가상각 계산 공식 (lib/depreciation.ts)

```typescript
interface DepreciationInfo {
  purchasePrice: number;       // 취득가액 (VAT 포함)
  usefulLifeYears: number;     // 내용연수
  purchaseDate: Date;          // 취득일
  annualDepreciation: number;  // 연 감가액
  monthlyDepreciation: number; // 월 감가액
  elapsedYears: number;        // 경과연수 (소수점)
  bookValue: number;           // 현재 장부가액
  depreciationRate: number;    // 감가율 (0~1)
}

function calculateDepreciation(
  cost: number,
  usefulLifeYears: number,
  purchaseDate: Date,
  asOfDate: Date = new Date()
): DepreciationInfo {
  const annualDepreciation = Math.floor(cost / usefulLifeYears);
  const monthlyDepreciation = Math.floor(annualDepreciation / 12);
  const elapsedMs = asOfDate.getTime() - purchaseDate.getTime();
  const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
  const totalDepreciation = Math.min(
    Math.floor(annualDepreciation * elapsedYears),
    cost
  );
  const bookValue = Math.max(cost - totalDepreciation, 0);
  const depreciationRate = cost > 0 ? totalDepreciation / cost : 0;

  return {
    purchasePrice: cost,
    usefulLifeYears,
    purchaseDate,
    annualDepreciation,
    monthlyDepreciation,
    elapsedYears: Math.round(elapsedYears * 100) / 100,
    bookValue,
    depreciationRate: Math.round(depreciationRate * 100) / 100,
  };
}
```

> 이 유틸리티는 서버/클라이언트 모두에서 사용 가능 (순수 TypeScript).
