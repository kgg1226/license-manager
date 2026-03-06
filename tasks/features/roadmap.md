# 제품 로드맵

> 기획 세션(/planning)에서 관리한다.
> 최종 업데이트: 2026-03-05

---

## 제품 목표

**"회사의 모든 정보자산을 한 곳에서 관리하고, 월별 비용 보고서를 자동으로 만든다."**

- 담당자가 누구든 자산 현황을 즉시 파악 가능
- 매달 보고서를 수동으로 만들지 않아도 됨
- 감사·컴플라이언스 대응을 위한 증적 파일 내보내기

---

## Phase 1 — 소프트웨어 라이선스 관리 ✅ 완료

**범위:** 소프트웨어 라이선스 등록·배정·반납·갱신 알림

### 완료된 기능
- 라이선스 CRUD (KEY_BASED / VOLUME / NO_KEY)
- 시트(개별 키) 관리, 중복 검사
- 갱신 상태·일자·이력·담당자
- D-70/30/15/7 갱신 알림 (Slack + Email)
- 조직원 배정·반납
- 조직 구조 (OrgCompany / OrgUnit 트리)
- 감사 로그 (AuditLog)
- Admin 사용자 관리
- CSV 임포트

---

## Phase 2 — 자산 유형 확장 + Supabase 전환 🔄 진행 중

**목표:** 소프트웨어 외 모든 자산 유형을 동일한 인터페이스로 관리

### 2-1. 인프라 전환 (선행 필수)
- SQLite → Supabase PostgreSQL
- 상세: `tasks/features/asset-management.md#인프라-전환`

### 2-2. 자산 유형 확장
> 상세 스펙: `tasks/features/asset-management.md`

| 유형 | 설명 | 예시 |
|---|---|---|
| `SOFTWARE` | 소프트웨어 라이선스 (기존) | Office 365, Adobe CC |
| `CLOUD` | 클라우드·SaaS 구독 | AWS, GCP, Slack, Notion |
| `HARDWARE` | 실물 자산 | PC, 서버, 모니터, 휴대폰 |
| `DOMAIN_SSL` | 도메인·SSL 인증서 | company.com, *.company.com |
| `OTHER` | 기타 | 유지보수 계약 등 |

### 2-3. 공통 자산 속성
- 비용·결제 주기·통화 (기존 License 모델의 cost 필드 구조 재사용)
- 구매일·만료일·갱신일
- 담당자 (개인 또는 부서)
- 배정 대상 (조직원 또는 OrgUnit)

---

## Phase 3 — 월별 비용 보고서 📋 예정

**목표:** 매달 1회 자동 생성되는 비용 보고서. Excel/PDF 내보내기.
> 상세 스펙: `tasks/features/monthly-report.md`

### 보고서 포함 내용
1. **자산 현황 요약** — 유형별 자산 수, 총 월 비용
2. **부서별 비용 배분** — 어느 팀이 얼마나 쓰는지
3. **이번 달 변동** — 신규 취득 / 반납 / 폐기
4. **다음 달 만료 예정** — 갱신 필요 자산 목록
5. **미배정 자산** — 놀고 있는 자산

### 내보내기 형식
- Excel (.xlsx) — 데이터 편집·분석용
- PDF — 결재·보관용

---

## Phase 4 — 증적·컴플라이언스 (미정)

- 자산 배정 이력 내보내기 (특정 기간)
- 감사 로그 내보내기 (AuditLog → Excel/PDF)
- ISMS·ISO 27001 대응 체크리스트

---

## 아키텍처 방향

### DB 구조 원칙
- 기존 `License` 모델은 유지하되, 새 자산 유형은 **`Asset` 범용 모델**로 추가
- `Asset.type` 으로 유형 분기
- 유형별 상세 정보는 별도 테이블 (`HardwareDetail`, `CloudDetail` 등)
- 비용 집계는 `Asset.monthlyCost` 필드 기준으로 통일

### 마이그레이션 전략
- Phase 1의 `License` 데이터는 `Asset(type=SOFTWARE)` 로 점진적 마이그레이션 (또는 뷰로 통합)
- 기존 API는 유지, 신규 자산 API를 `app/api/assets/` 하위에 추가
