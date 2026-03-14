# 자산 관리 시스템 확장 로드맵 (Asset Expansion Roadmap)

> 🔒 보안 세션 + 기획 세션
> 준거: ISMS-P 1.1~1.4, ISO 27001 A.8
> 최종 업데이트: 2026-03-05

---

## 개요

Asset Manager는 현재 **라이선스, 직원, 조직 정보**를 관리하고 있습니다.
추가로 **하드웨어, 클라우드 구독, 도메인**을 관리하는 기능을 단계적으로 확장합니다.

### 최종 목표
> **모든 회사 자산을 통합 관리하는 정보자산 통합 플랫폼**

---

## 현재 상태 (As-Is)

### 관리 중인 자산
- ✅ Software License (라이선스)
- ✅ Employee (직원 정보)
- ✅ Organization (조직 구조)

### 관리 대상 확장 필요
- ❌ Hardware (서버, PC, 네트워크 기기)
- ❌ Cloud Subscription (AWS, Azure, GCP 등)
- ❌ Domain (도메인, SSL 인증서)

---

## 확장 로드맵 (Expansion Roadmap)

### Phase 1: 기초 인프라 강화 (2026-Q1~Q2)

**목표**: 현재 시스템 보안 강화 + 자산 관리 기반 마련

#### 1.1 데이터베이스 보안 (Backend)
- [ ] PII 암호화 저장 (AES-256)
- [ ] 라이선스 키 암호화 저장
- [ ] 자동 백업 시스템 구축
- [ ] 백업 암호화

**산출물**:
- Encrypted schema updates
- Backup automation script

#### 1.2 자산 관리 기초 (Backend)
- [ ] 자산 태그/분류 시스템 설계
- [ ] 자산 속성 확장 모델 설계
- [ ] 다국어 지원 (자산명 등)

**산출물**:
- `tasks/db-changes.md` 업데이트 (자산 확장 필드)
- Schema design doc

#### 1.3 감사·로깅 강화 (Backend)
- [ ] 자산 생명주기 이벤트 로깅
- [ ] 접근 통제 로깅 강화
- [ ] 로그 무결성 검증 (HMAC)

**산출물**:
- Enhanced AuditLog schema

**기대 일정**: 2026-03-31
**담당**: Backend + DevOps

---

### Phase 2: 하드웨어 자산 관리 (2026-Q2~Q3)

**목표**: 서버, PC, 네트워크 기기 중앙 관리

#### 2.1 하드웨어 데이터 모델 (Backend)

```prisma
model Hardware {
  id          Int     @id @default(autoincrement())
  assetId     String  @unique              // 자산ID (TAG 또는 시리얼)
  category    HardwareCategory            // SERVER, PC, NETWORK, STORAGE
  name        String                      // 기기명
  model       String                      // 모델명
  serialNo    String?                     // 시리얼 번호

  // 소유권
  ownerType   String                      // PERSON, DEPARTMENT, EXTERNAL
  ownerId     Int?                        // Employee.id 또는 OrgUnit.id

  // 위치
  location    String                      // 물리적 위치

  // 라이프사이클
  purchaseDate  DateTime?
  warrantyUntil DateTime?
  status      HardwareStatus              // ACTIVE, INACTIVE, DISPOSED
  disposedAt  DateTime?

  // 규격
  specs       JSON?                       // CPU, RAM, Storage 등

  // 관계
  assignments HardwareAssignment[]
  auditLog    AuditLog[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum HardwareCategory {
  SERVER
  PC
  LAPTOP
  MOBILE
  TABLET
  NETWORK
  STORAGE
  PRINTER
  OTHER
}

enum HardwareStatus {
  ACTIVE
  INACTIVE
  DISPOSED
}

model HardwareAssignment {
  id          Int       @id @default(autoincrement())
  hardwareId  Int
  employeeId  Int?      // 담당자
  departmentId Int?     // 부서

  assignedAt  DateTime  @default(now())
  returnedAt  DateTime?

  hardware    Hardware  @relation(fields: [hardwareId], references: [id], onDelete: Cascade)
}
```

#### 2.2 API 설계 (Backend)

```
GET /api/hardware                    // 하드웨어 목록 (필터: 카테고리, 상태)
POST /api/hardware                   // 하드웨어 등록 (ADMIN)
GET /api/hardware/[id]               // 하드웨어 상세
PUT /api/hardware/[id]               // 하드웨어 수정 (ADMIN)
DELETE /api/hardware/[id]            // 하드웨어 삭제 (ADMIN)

POST /api/hardware/[id]/assign       // 할당 (ADMIN)
POST /api/hardware/[id]/return       // 반납 (ADMIN)

GET /api/hardware/inventory          // 보유 현황 (분류별, 상태별)
```

#### 2.3 UI 설계 (Frontend)

```
/hardware                    // 하드웨어 목록 (테이블)
  ├─ 검색 & 필터 (카테고리, 상태, 위치)
  ├─ 분류별 요약 카드
  └─ CSV 내보내기

/hardware/new                // 하드웨어 등록 폼
/hardware/[id]               // 하드웨어 상세 (할당 이력 포함)
/hardware/[id]/edit          // 하드웨어 수정

/settings/hardware           // 하드웨어 관리 (카테고리 설정 등)
```

**기대 일정**: 2026-06-30
**담당**: Backend + Frontend

---

### Phase 3: 클라우드 구독 관리 (2026-Q3~Q4)

**목표**: AWS, Azure, GCP 등 클라우드 자원 통합 관리

#### 3.1 클라우드 구독 데이터 모델

```prisma
model CloudSubscription {
  id          Int     @id @default(autoincrement())
  name        String  @unique
  provider    CloudProvider               // AWS, AZURE, GCP, SALESFORCE

  // 계정 정보
  accountId   String                      // AWS account ID 등
  email       String?                     // 계정 이메일

  // 비용
  monthlyBudget   Float?
  annualCost      Float?
  currency        String  @default("KRW")

  // 구독 정보
  subscriptionTier String?                // Free, Pro, Enterprise
  renewalDate      DateTime?
  autoRenew        Boolean @default(true)

  // 라이프사이클
  status      SubscriptionStatus          // ACTIVE, INACTIVE, CANCELLED
  startDate   DateTime
  cancelDate  DateTime?

  // 책임자
  ownerType   String                      // PERSON, DEPARTMENT
  ownerId     Int?                        // User.id 또는 OrgUnit.id

  // 리소스 현황
  resources   JSON?                       // { "instances": 5, "storage": 100 }

  auditLog    AuditLog[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum CloudProvider {
  AWS
  AZURE
  GCP
  SALESFORCE
  SLACK
  GITHUB
  OTHER
}

enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  CANCELLED
}
```

#### 3.2 자동 갱신 알림 (Backend)

```
- 갱신 예정일 30일 전: 이메일 알림
- 갱신 예정일 7일 전: 경고 알림
- 갱신 예정일 당일: 최종 확인
```

#### 3.3 월별 비용 대시보드 (Frontend)

```
/dashboard/cloud-costs
  ├─ Provider별 비용 요약 (차트)
  ├─ 월별 추이 (Line chart)
  ├─ 갱신 예정 (Timeline)
  └─ 최적화 권장사항

/cloud-subscriptions          // 구독 목록
/cloud-subscriptions/[id]     // 구독 상세
```

**기대 일정**: 2026-09-30
**담당**: Backend + Frontend

---

### Phase 4: 도메인 관리 (2026-Q4~2027-Q1)

**목표**: 도메인 및 SSL 인증서 통합 관리

#### 4.1 도메인 데이터 모델

```prisma
model Domain {
  id          Int     @id @default(autoincrement())
  name        String  @unique              // example.com
  registrar   String                      // GoDaddy, Route53 등

  // 등록 정보
  registrationDate DateTime?
  expiryDate       DateTime?
  autoRenew        Boolean @default(true)

  // DNS 설정
  dnsProvider String?                     // Route53, Cloudflare 등
  dnsRecords  JSON?                       // A, MX, TXT 등

  // SSL/TLS 인증서
  certificate SSLCertificate[]

  // 목적
  purpose     String                      // MAIN, MAIL, INTERNAL 등
  usedBy      String?                     // 프로젝트/부서명

  // 라이프사이클
  status      DomainStatus                // ACTIVE, INACTIVE, EXPIRED

  // 비용
  annualCost  Float?
  currency    String  @default("KRW")

  // 책임자
  ownerType   String                      // PERSON, DEPARTMENT
  ownerId     Int?

  auditLog    AuditLog[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model SSLCertificate {
  id          Int     @id @default(autoincrement())
  domainId    Int
  domain      Domain  @relation(fields: [domainId], references: [id], onDelete: Cascade)

  issuer      String                      // Let's Encrypt, DigiCert 등
  issuedAt    DateTime
  expiresAt   DateTime

  autoRenew   Boolean @default(true)

  status      CertStatus                  // VALID, EXPIRING, EXPIRED

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum DomainStatus {
  ACTIVE
  INACTIVE
  EXPIRED
  PENDING_RENEWAL
}

enum CertStatus {
  VALID
  EXPIRING
  EXPIRED
  REVOKED
}
```

#### 4.2 자동 모니터링 (DevOps)

```
- 도메인 만료 7일 전: 알림
- SSL 인증서 만료 30일 전: 알림
- 자동 갱신 실패: 경고
```

**기대 일정**: 2027-01-31
**담당**: Backend + DevOps

---

## 구현 우선순위

### Tier 1 (긴급)
1. **PII/라이선스 키 암호화** (2026-03 완료 목표)
2. **자동 백업 시스템** (2026-03 완료 목표)

### Tier 2 (중요)
3. **하드웨어 자산 관리** (2026-06 목표)
4. **클라우드 구독 관리** (2026-09 목표)

### Tier 3 (개선)
5. **도메인 관리** (2027-01 목표)

---

## 기술 스택 확장

### 추가 필요 라이브러리
```json
{
  "crypto": "bcrypt (이미 포함), crypto-js",
  "cloud-sdk": "@aws-sdk/client-s3, @azure/storage-blob",
  "notifications": "nodemailer (이미 포함)",
  "scheduling": "node-cron, bull (Redis)"
}
```

### 인프라 확장
- AWS S3: 백업 저장소
- Redis (선택): Rate limiter, Task Queue
- 이메일 서버: 갱신 알림 발송

---

## 비용 추정

| Phase | 항목 | 시간(시간) | 비고 |
|-------|------|----------|------|
| 1 | 보안 강화 | 40 | Backend: 24h, DevOps: 16h |
| 2 | 하드웨어 관리 | 60 | Backend: 30h, Frontend: 30h |
| 3 | 클라우드 구독 | 50 | Backend: 28h, Frontend: 22h |
| 4 | 도메인 관리 | 40 | Backend: 24h, DevOps: 16h |

**Total**: ~190시간 (약 5개월, 주당 10시간 투입 기준)

---

## 리스크 및 고려사항

### 기술 리스크
- 암호화 키 관리 복잡성 → KMS 도입 검토 필요
- 클라우드 API 통합 인증 → OAuth/Service Account 관리
- 다중 벤더 도메인/인증서 관리 → API 표준화 필요

### 운영 리스크
- 자산 데이터 정확성 유지 (수동 입력 오류)
- 정기 감사 및 검증 필요
- 변경사항 추적 및 감시 필요

### 준거 리스크
- ISMS-P 신규 자산에 대한 분류/보호 필요
- 개인정보 취급 기준 명확화 필요

---

## 성공 지표 (KPI)

| 항목 | 목표 | 측정 방법 |
|------|------|---------|
| 자산 관리 완성도 | 100% 자산 추적 | asset-inventory.md 검증 |
| 데이터 보안 | 암호화 달성 | 감사 로그 분석 |
| 정책 준수 | ISMS-P 100% 준수 | 분기별 감사 |
| 사용자 만족도 | 80% 이상 | 설문조사 |

---

## 스폰서 및 승인

- **Project Sponsor**: [경영진명]
- **Security Owner**: Security Team
- **Technical Lead**: Backend Lead + DevOps Lead
- **최종 승인**: [Date]

---

## 변경 이력

| 날짜 | 변경 내용 | 버전 |
|------|-----------|------|
| 2026-03-05 | 초안 작성 — 4단계 확장 로드맵 | 1.0 |

---

**다음 리뷰**: 2026-06-30 (Phase 2 진행 상황 평가)
