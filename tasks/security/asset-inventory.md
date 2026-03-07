# 자산 인벤토리 (Asset Inventory)

> 🔒 보안 세션이 관리
> 준거: ISMS-P 1.1~1.4, ISO 27001 A.8.1, A.8.2
> 최종 업데이트: 2026-03-05

---

## 자산 분류 기준

| 분류 | 설명 | 예시 |
|------|-----|------|
| **정보자산** | 소프트웨어, 데이터, 문서 | 라이선스, 직원 정보, 감사로그 |
| **시스템자산** | 하드웨어, 인프라, 애플리케이션 | 서버, DB, Docker 컨테이너 |
| **인물자산** | 관리자, 개발자, 운영자 | 사용자 계정, 역할, 권한 |
| **물리자산** | 물리적 자원 | 네트워크 기기, 저장 매체 |

---

## 1. 정보자산 (Information Assets)

### 1.1 운영 데이터 (Operational Data)

| ID | 자산명 | 저장위치 | 민감도 | 책임자 | 수명주기 | 비고 |
|----|--------|--------|--------|--------|---------|------|
| IA-001 | License (라이선스) | SQLite DB | Medium | Backend | 운영 중 | Prisma License 모델 |
| IA-002 | Employee (직원정보) | SQLite DB | **High** | HR/Admin | 운영 중 | 개인정보 (이름, 이메일, 직급) |
| IA-003 | Assignment (할당정보) | SQLite DB | Medium | Backend | 운영 중 | 라이선스-직원 매핑 |
| IA-004 | LicenseSeat (라이선스키) | SQLite DB | **Critical** | Backend | 운영 중 | 마스킹 필수 (암호 수준) |
| IA-005 | OrgUnit (조직구조) | SQLite DB | Low | HR | 운영 중 | 계층 관계 |
| IA-006 | LicenseGroup (그룹정보) | SQLite DB | Low | Admin | 운영 중 | 자동할당 그룹 |
| IA-007 | OrgCompany (회사정보) | SQLite DB | Low | Admin | 운영 중 | 다중 회사 지원 |

### 1.2 개인정보 (Personally Identifiable Information - PII)

| ID | 항목 | 출처 | 용도 | 보유기간 | 보호조치 |
|----|------|------|------|---------|---------|
| PII-001 | 직원명 | Employee.name | 조직원 관리 | 재직 기간 + 1년 | 접근제어, 감사로그 |
| PII-002 | 이메일 | Employee.email | 연락처 | 재직 기간 + 1년 | 접근제어, 감사로그 |
| PII-003 | 직급 | Employee.title | 조직관리 | 재직 기간 + 1년 | 접근제어, 감사로그 |
| PII-004 | 부서 | Employee.department | 부서관리 | 재직 기간 + 1년 | 접근제어, 감사로그 |
| PII-005 | 라이선스키 | LicenseSeat.key | 라이선스 운영 | 사용기간 | **암호화 저장 필요** ⚠️ |

### 1.3 감사 및 운영 로그 (Audit & Operational Logs)

| ID | 자산명 | 저장위치 | 보존기간 | 접근권한 | 비고 |
|----|--------|--------|---------|---------|------|
| LOG-001 | AuditLog | SQLite DB | 2년 | Admin only | 모든 변경사항 기록 |
| LOG-002 | Session | SQLite DB | 세션 종료 후 자동 삭제 | 자동 | 7일 고정 만료 |
| LOG-003 | Error Log | 콘솔/파일 | 30일 | DevOps | 배포 환경별 관리 |
| LOG-004 | Access Log | (미구현) | 90일 | Admin | 구현 예정 |

### 1.4 정책 및 문서 (Policies & Documents)

| ID | 문서명 | 저장위치 | 분류 | 최종수정 |
|----|--------|--------|------|---------|
| DOC-001 | 보안 가이드라인 | tasks/security/guidelines.md | Internal | 2026-03-05 |
| DOC-002 | 위협 모델 | tasks/security/threat-model.md | Internal | 2026-03-05 |
| DOC-003 | API 스펙 | tasks/api-spec.md | Internal | 2026-03-04 |
| DOC-004 | DB 변경 명세 | tasks/db-changes.md | Internal | 2026-03-04 |

---

## 2. 시스템 자산 (System Assets)

### 2.1 애플리케이션 (Application)

| ID | 자산명 | 버전 | 역할 | 상태 | 책임자 |
|----|--------|------|------|------|--------|
| SYS-001 | License Manager | 1.0 | 라이선스 관리 | 운영 중 | Backend |
| SYS-002 | Next.js | 16.2.0-canary | 웹 프레임워크 | 운영 중 | Frontend |
| SYS-003 | Prisma | 7 | ORM | 운영 중 | Backend |
| SYS-004 | SQLite | 3.x | DB 엔진 | 운영 중 | DevOps |

### 2.2 인프라 (Infrastructure)

| ID | 자산명 | 사양 | 위치 | 상태 | 책임자 |
|----|--------|------|------|------|--------|
| INF-001 | EC2 인스턴스 | t4g.small (ARM64) | AWS | 운영 중 | DevOps |
| INF-002 | SQLite DB 파일 | (호스트 경로) | EC2 호스트 | 운영 중 | DevOps |
| INF-003 | Docker 컨테이너 | Next.js App | EC2 | 운영 중 | DevOps |
| INF-004 | 네트워크 | 폐쇄망 (VPN) | AWS VPC | 운영 중 | DevOps |

### 2.3 소프트웨어 의존성 (Dependencies)

| ID | 패키지명 | 버전 | 용도 | 상태 | 유지보수 |
|----|----------|------|------|------|---------|
| DEP-001 | bcryptjs | - | 비밀번호 해싱 | ✅ 활성 | npm |
| DEP-002 | react | 19 | UI 프레임워크 | ✅ 활성 | npm |
| DEP-003 | tailwindcss | 4 | CSS 프레임워크 | ✅ 활성 | npm |
| DEP-004 | better-sqlite3 | - | SQLite 드라이버 | ✅ 활성 | npm |

---

## 3. 인물 자산 (Personnel Assets)

### 3.1 사용자 계정 (User Accounts)

| ID | 사용자명 | 역할 | 상태 | 마지막 로그인 | 책임자 |
|----|----------|------|------|---------------|--------|
| USR-001 | admin | ADMIN | ✅ 활성 | (확인 필요) | Security |
| USR-002 | (일반사용자) | USER | ✅ 활성 | (확인 필요) | Admin |

### 3.2 접근 권한 (Access Rights)

| 역할 | 권한 | 제한사항 | 검증주기 |
|------|------|---------|---------|
| **ADMIN** | 모든 API 접근 (POST/PUT/DELETE) | 없음 | 분기별 |
| **USER** | 읽기 권한만 (GET) | 쓰기 제한 | 분기별 |

---

## 4. 물리 자산 (Physical Assets)

| ID | 자산명 | 용도 | 위치 | 상태 | 책임자 |
|----|--------|------|------|------|--------|
| PHY-001 | AWS 계정 | 클라우드 인프라 | - | ✅ 활성 | DevOps |
| PHY-002 | GitHub 저장소 | 소스 코드 | github.com | ✅ 활성 | Backend |
| PHY-003 | 백업 스토리지 | DB 백업 | AWS S3 (예정) | ⚠️ 미구현 | DevOps |

---

## 5. 자산 민감도 분류

### Critical (최고 보안)
- `LicenseSeat.key` — 라이선스 키 (비즈니스 가치, 암호 수준)
- `User.password` — 사용자 비밀번호
- `AuditLog` — 감사 기록

### High (높은 보안)
- `Employee.name` — 직원명 (개인정보)
- `Employee.email` — 이메일 (개인정보)
- `Employee.title`, `department` — 직급, 부서 (개인정보)

### Medium (중간 보안)
- `License.*` — 라이선스 정보 (비즈니스 데이터)
- `Assignment.*` — 할당 정보

### Low (기본 보안)
- `OrgUnit.*` — 조직 구조
- `LicenseGroup.*` — 그룹 정보

---

## 6. 자산 생명주기 (Asset Lifecycle)

```
[등록] → [분류] → [운영] → [검토] → [폐기/보관]
```

### 6.1 등록 (Registration)
- 새로운 자산 발견 시 즉시 등록
- 자산명, 민감도, 책임자, 위치 기록

### 6.2 분류 (Classification)
- 민감도 평가
- 보유기간 결정
- 접근제어 정의

### 6.3 운영 (Operation)
- 정기적 감시 (월간)
- 접근 권한 검증 (분기별)
- 백업 및 복구 테스트 (반기별)

### 6.4 검토 (Review)
- 사용 중단 여부 확인
- 보안 정책 준수 확인
- 감시 결과 검토

### 6.5 폐기/보관 (Disposal)
- 안전한 삭제 (암호화 키 제거)
- 감사 로그 보존
- 증명서 발급

---

## 7. 자산 접근 통제 (Asset Access Control)

| 자산 | ADMIN | USER | DevOps | Security |
|------|-------|------|--------|----------|
| License | R/W | R | R | R |
| Employee | R/W | R (own) | R | R |
| LicenseSeat | R/W | - | R | R |
| AuditLog | R/W | - | R | **R/W** |
| User 계정 | R/W | - | - | R/W |
| System Config | R/W | - | **R/W** | R |

---

## 8. 자산 리포팅 (Asset Reporting)

### 월간 자산 리포트
```
📋 자산 현황:
  - 정보자산: 7개
  - 시스템자산: 4개 + 의존성 4개
  - 개인정보: 5개 항목
  - 접근 이상: (감사로그 기반)
```

### 분기별 자산 검증
```
✅ 자산 인벤토리 갱신
✅ 민감도 재평가
✅ 접근권한 검증
✅ 정책 준수 확인
```

### 연간 자산 감사
```
🔍 전체 자산 감시
🔍 폐기 대상 식별
🔍 정책 효과성 평가
🔍 컴플라이언스 보고
```

---

## 9. 미구현 자산 (Future Assets)

| ID | 자산명 | 우선순위 | 계획 일시 |
|----|--------|---------|---------|
| FUT-001 | 하드웨어 인벤토리 | Medium | 2026-04 |
| FUT-002 | 도메인 관리 | Low | 2026-06 |
| FUT-003 | 클라우드 구독 | Medium | 2026-04 |
| FUT-004 | 백업 시스템 | **High** | 2026-03 |
| FUT-005 | 접근 로그 (완전 구현) | Medium | 2026-05 |

---

## 10. 참고 기준

### ISMS-P 자산관리
- 1.1: 정보자산 목록 작성 및 관리 ✅
- 1.2: 자산 분류 ✅
- 1.3: 자산 책임자 지정 ✅
- 1.4: 자산 식별 및 추적 ✅

### ISO 27001
- A.8.1: 정보 및 자산의 분류 ✅
- A.8.2: 정보 및 자산의 취급 ✅
- A.8.3: 접근 통제 ✅

### ISO 27701 (개인정보)
- PII 분류 ✅
- 보유기간 관리 ✅
- 접근통제 ✅

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-05 | 초안 작성 — License Manager 자산 완전 인벤토리화 |
