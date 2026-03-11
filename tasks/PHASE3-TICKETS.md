# 🎫 Phase 3 티켓 — 월별 자동 증적 (보고서 생성)

> **Phase**: Phase 3 — Automated Monthly Report Generation
> **기간**: 2026-03-15 ~ 2026-04-04 (3주)
> **상태**: 📋 기획 단계
> **목표**: 월별 자산 비용 보고서 자동 생성 및 발송

---

## 📋 Phase 3 개요

### 배경
- Phase 2에서 Asset 관리 시스템 완성
- 이제 월별 자동 보고서 생성 필요
- 경영진 보고, 비용 분석, 감사 증적용

### 목표
1. 매월 말 자동으로 자산 비용 리포트 생성
2. Excel 및 PDF 형식으로 자동 내보내기
3. 담당자에게 자동 이메일 발송
4. ISO27001/ISMS-P 증적 완성

### 예상 효과
- ✅ 수동 보고서 작성 시간 90% 단축
- ✅ 정확한 비용 추적 가능
- ✅ 규정 준수 증적 자동화

---

## 🎯 Backend 티켓 (BE-030~034)

### [BE-030] Monthly Report Data Collection API

**담당**: Backend Role
**우선순위**: 🔴 Critical (Phase 3 기초)
**난이도**: 🟡 중간 (2-3일)
**상태**: ✅ 완료 (PR #36, 2026-03-10)
**파일**: `app/api/reports/monthly/[yearMonth]/data/route.ts`

#### 요구사항
- [ ] GET /api/reports/monthly/{yearMonth}/data
  - 파라미터: `yearMonth` (예: "2026-03")
  - 응답: 해당 월의 모든 Asset 데이터 (시작일, 종료일 기준)
  - 집계: 자산 유형별, 상태별, 부서별 비용 합계

#### 응답 형식
```json
{
  "period": "2026-03",
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "summary": {
    "totalCost": 125000.00,
    "currency": "USD",
    "assetCount": 35
  },
  "byType": [
    { "type": "SOFTWARE", "count": 10, "cost": 60000 },
    { "type": "CLOUD", "count": 8, "cost": 40000 },
    { "type": "HARDWARE", "count": 5, "cost": 15000 },
    { "type": "DOMAIN_SSL", "count": 8, "cost": 8000 },
    { "type": "OTHER", "count": 4, "cost": 2000 }
  ],
  "byStatus": [...],
  "byDepartment": [...],
  "assetDetails": [
    { "id": "...", "name": "...", "type": "...", "cost": ..., "assignedTo": "..." }
  ]
}
```

#### 완료 조건
- [ ] API 구현
- [ ] 데이터 집계 로직 정확성 검증
- [ ] 테스트 통과

---

### [BE-031] Excel Report Generation API

**담당**: Backend Role
**우선순위**: 🔴 Critical
**난이도**: 🟠 어려움 (2-3일)
**상태**: ✅ 완료 (PR #36, 2026-03-10)
**파일**: `app/api/reports/monthly/[yearMonth]/excel/route.ts`

#### 요구사항
- [ ] GET /api/reports/monthly/{yearMonth}/excel
- [ ] 응답: Excel 파일 다운로드 (Content-Type: application/vnd.ms-excel)
- [ ] 파일명: `Asset_Report_2026-03.xlsx`
- [ ] 시트 구성:
  1. Summary (요약)
  2. By Type (유형별)
  3. By Status (상태별)
  4. By Department (부서별)
  5. Details (상세 목록)

#### 시트 구성 예시

**Summary Sheet**
```
| 항목 | 값 |
|------|-----|
| 기간 | 2026-03 |
| 총 비용 | $125,000 |
| 자산 개수 | 35 |
| 갱신 필요 | 5개 |
```

**Details Sheet**
```
| 자산명 | 유형 | 상태 | 비용 | 담당자 | 만료일 |
|--------|------|------|-----|-------|--------|
| MS 365 | SOFTWARE | ACTIVE | $1,200 | 이순신 | 2026-12-31 |
| ... | ... | ... | ... | ... | ... |
```

#### 사용 라이브러리
- `exceljs` 또는 `xlsx` (패키지 추가 필요)

#### 완료 조건
- [ ] Excel 생성 로직 구현
- [ ] 서식 및 데이터 정확성 검증
- [ ] 테스트 통과

---

### [BE-032] PDF Report Generation API

**담당**: Backend Role
**우선순위**: 🟡 중간 (선택)
**난이도**: 🟠 어려움 (2-3일)
**상태**: ✅ 완료 (PR #36, 2026-03-10)
**파일**: `app/api/reports/monthly/[yearMonth]/pdf/route.ts`

#### 요구사항
- [ ] GET /api/reports/monthly/{yearMonth}/pdf
- [ ] 응답: PDF 파일 다운로드
- [ ] 파일명: `Asset_Report_2026-03.pdf`
- [ ] 포함 내용:
  - 표지 (회사명, 기간, 생성일)
  - 요약 정보
  - 차트 (비용 분포)
  - 상세 표
  - 주석

#### 사용 라이브러리
- `puppeteer` 또는 `pdfkit` (패키지 추가 필요)

#### 완료 조건
- [ ] PDF 생성 로직 구현
- [ ] 레이아웃 및 가독성 검증
- [ ] 테스트 통과

---

### [BE-033] Batch: Monthly Report Auto-Generation

**담당**: Backend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (1-2일)
**상태**: ✅ 완료 (PR #36, 2026-03-10)
**파일**: `app/api/cron/monthly-report-generation/route.ts`

#### 요구사항
- [ ] POST /api/cron/monthly-report-generation
  - 트리거: 매월 1일 자정 (또는 지정된 시간)
  - 작업: 전월 데이터 기준으로 리포트 생성
  - 생성 대상: Excel, PDF, JSON
  - 저장 위치: 데이터베이스 또는 클라우드 스토리지

#### 로직
```
1. 현재 월 이전 월 계산 (예: 3월이면 2월)
2. BE-030 API 호출 → 데이터 수집
3. BE-031 API 호출 → Excel 생성
4. BE-032 API 호출 → PDF 생성 (선택)
5. 생성된 파일 저장
6. 해당 담당자 리스트 조회
7. BE-034 API 호출 → 이메일 발송
8. 완료 로그 기록
```

#### 완료 조건
- [ ] 배치 로직 구현
- [ ] 크론 스케줄 설정 (매월 1일)
- [ ] 테스트 통과

---

### [BE-034] Email Notification API

**담당**: Backend Role
**우선순위**: 🟡 중간
**난이도**: 🟢 쉬움 (1일)
**상태**: ✅ 완료 (PR #36, 2026-03-10)
**파일**: `app/api/reports/monthly/send-email/route.ts`

#### 요구사항
- [ ] POST /api/reports/monthly/send-email
  - 요청: `{ yearMonth, recipients: [email1, email2, ...] }`
  - 작업: 생성된 리포트를 이메일로 발송
  - 첨부: Excel, PDF 파일
  - 이메일 템플릿: HTML 형식

#### 이메일 템플릿
```html
<h2>월별 자산 비용 리포트</h2>
<p>기간: {{period}}</p>
<p>총 비용: {{totalCost}}</p>
<p>자산 개수: {{assetCount}}</p>
<p>자세한 내용은 첨부 파일을 참고하세요.</p>
```

#### 사용 라이브러리
- `nodemailer` (기존)

#### 완료 조건
- [ ] 이메일 발송 로직 구현
- [ ] 템플릿 완성
- [ ] 테스트 통과

---

## 🎨 Frontend 티켓 (FE-020~022)

### [FE-020] Report List & Download Page

**담당**: Frontend Role
**우선순위**: 🟡 중간
**난이도**: 🟡 중간 (2-3일)
**상태**: 📋 오픈
**경로**: `app/reports/page.tsx`

#### 요구사항
- [ ] 생성된 리포트 목록 표시
  - 기간, 생성일, 상태, 다운로드 링크
  - 필터: 기간별 검색
  - 정렬: 생성일 역순
- [ ] 다운로드 버튼
  - Excel 다운로드
  - PDF 다운로드
  - JSON 다운로드
- [ ] 리포트 미리보기 (선택)

#### 완료 조건
- [ ] 리포트 목록 페이지 완성
- [ ] 다운로드 기능 정상
- [ ] 반응형 디자인 확인

---

### [FE-021] Report Detail & Viewer

**담당**: Frontend Role
**우선순위**: 🟡 중간
**난이도**: 🟡 중간 (1-2일)
**상태**: 📋 오픈
**경로**: `app/reports/[id]/page.tsx`

#### 요구사항
- [ ] 리포트 상세 정보 표시
  - 요약 정보 (기간, 총 비용, 자산 개수)
  - 차트 (비용 분포)
  - 상세 테이블
- [ ] 인터랙티브 차트
  - 유형별 비용 분포 (원형 차트)
  - 상태별 자산 분포 (막대 차트)

#### 사용 라이브러리
- `recharts` (이미 설치 가능) 또는 `chart.js`

#### 완료 조건
- [ ] 상세 페이지 완성
- [ ] 차트 표시 정상
- [ ] 데이터 정확성 확인

---

### [FE-022] Scheduled Report Settings

**담당**: Frontend Role
**우선순위**: 🟢 낮음
**난이도**: 🟡 중간 (1-2일)
**상태**: 📋 오픈
**경로**: `app/settings/reports/page.tsx`

#### 요구사항
- [ ] 자동 리포트 설정
  - 수신자 목록 관리 (추가, 삭제)
  - 발송 시간 설정
  - 형식 선택 (Excel, PDF)
  - 활성화/비활성화
- [ ] 테스트 발송 버튼

#### 완료 조건
- [ ] 설정 페이지 완성
- [ ] 저장 기능 정상
- [ ] 테스트 발송 확인

---

## 🔧 DevOps 티켓 (OPS-020~021)

### [OPS-020] Cloud Storage Setup (Optional)

**담당**: DevOps Role
**우선순위**: 🟢 낮음
**난이도**: 🟡 중간 (1-2일)
**상태**: 📋 오픈

#### 요구사항
- [ ] 리포트 파일 저장소 결정
  - 옵션 1: 로컬 서버 (간단)
  - 옵션 2: AWS S3 (확장성)
  - 옵션 3: NAS (보안)
- [ ] 저장소 접근 권한 설정
- [ ] 백업 전략 수립

#### 완료 조건
- [ ] 저장소 구성 완료
- [ ] 권한 설정 완료
- [ ] 접근 테스트 완료

---

### [OPS-021] Report Delivery Monitoring

**담당**: DevOps Role
**우선순위**: 🟢 낮음
**난이도**: 🟡 중간 (1-2일)
**상태**: 📋 오픈

#### 요구사항
- [ ] 리포트 생성 모니터링
- [ ] 이메일 발송 성공률 추적
- [ ] 문제 발생 시 알림
- [ ] 로그 수집 및 분석

#### 완료 조건
- [ ] 모니터링 대시보드 구성
- [ ] 알림 규칙 설정
- [ ] 테스트 완료

---

## 🔒 Security 티켓 (SEC-201~202)

### [SEC-201] Report Access Control Policy

**담당**: Security Role
**우선순위**: 🟡 중간
**난이도**: 🟡 중간 (1-2일)
**상태**: 📋 오픈

#### 요구사항
- [ ] 리포트 조회 권한 정의
  - ADMIN: 모든 리포트 조회
  - USER: 자신의 부서 리포트만
  - GUEST: 접근 불가
- [ ] 다운로드 권한 제한
- [ ] 감사 로그 기록

#### 완료 조건
- [ ] 정책 문서 작성
- [ ] 코드 구현
- [ ] 테스트 통과

---

### [SEC-202] Sensitive Data Protection

**담당**: Security Role
**우선순위**: 🟡 중간
**난이도**: 🟡 중간 (1-2일)
**상태**: 📋 오픈

#### 요구사항
- [ ] 리포트 파일 암호화
- [ ] 이메일 전송 보안 (TLS)
- [ ] 파일 저장소 접근 제어
- [ ] 민감 정보 마스킹 (선택)

#### 완료 조건
- [ ] 암호화 구현
- [ ] 보안 정책 수립
- [ ] 테스트 통과

---

## 📊 Phase 3 진행률 추적

```
BE-030: [ ] Data Collection API
BE-031: [ ] Excel Generation
BE-032: [ ] PDF Generation
BE-033: [ ] Auto-Generation Batch
BE-034: [ ] Email Notification
FE-020: [ ] Report List Page
FE-021: [ ] Report Detail Page
FE-022: [ ] Schedule Settings
OPS-020: [ ] Cloud Storage (Optional)
OPS-021: [ ] Delivery Monitoring
SEC-201: [ ] Access Control
SEC-202: [ ] Data Protection
```

---

## 🚀 Phase 3 타임라인

### Week 1 (2026-03-15 ~ 2026-03-21)
- [ ] BE-030: Data Collection API
- [ ] BE-031: Excel Generation
- [ ] FE-020: Report List Page

### Week 2 (2026-03-22 ~ 2026-03-28)
- [ ] BE-032/033/034: PDF, Batch, Email
- [ ] FE-021: Detail Page
- [ ] SEC-201/202: Security Review

### Week 3 (2026-03-29 ~ 2026-04-04)
- [ ] FE-022: Settings Page
- [ ] OPS-020/021: Storage & Monitoring
- [ ] 통합 테스트 & 배포 준비

---

## ✅ Phase 3 완료 기준

- [ ] 모든 티켓 구현 완료
- [ ] Code Review 통과
- [ ] 보안 감사 완료
- [ ] 통합 테스트 통과
- [ ] 자동 생성 테스트 (2026년 4월 1일)
- [ ] 프로덕션 배포 완료

---

**Phase 3 성공으로 완전한 자동화 보고 시스템을 구축합니다!** 📊
