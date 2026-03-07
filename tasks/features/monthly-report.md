# 기능 스펙 — 월별 비용 보고서 (Phase 3)

> 기획 세션(/planning)에서 관리한다.
> 우선순위: 🟢 Phase 3 (자산 확장 후)
> 상태: ⏳ 대기 (Phase 2 완료 필요)
> 최종 업데이트: 2026-03-06

---

## 목표

매달 담당자가 수동으로 Excel을 만들던 비용 보고서를 자동 생성한다.
결재·보관용 PDF와 분석·편집용 Excel 두 가지 형식으로 내보낸다.

---

## 보고서 구성

### 1. 요약 (Summary)
| 항목 | 내용 |
|---|---|
| 대상 기간 | YYYY년 MM월 |
| 총 자산 수 | 유형별 소계 포함 |
| 이번 달 총 비용 | 통화별 합산 |
| 전월 대비 증감 | 금액 + % |
| 만료 예정 | 다음 30일 내 만료 자산 수 |

### 2. 유형별 비용 현황
| 유형 | 자산 수 | 월 비용 | 비중 |
|---|---|---|---|
| 소프트웨어 | n개 | ₩xxx | xx% |
| 클라우드 | n개 | ₩xxx | xx% |
| 하드웨어 | n개 | ₩0 (일시불) | — |
| 도메인·SSL | n개 | ₩xxx | xx% |

### 3. 부서별 비용 배분
- 각 자산의 `orgUnitId` 기준으로 집계
- 미배정 자산은 "미배정" 항목으로 별도 표시
- 트리 구조 집계: 하위 부서 비용 → 상위 부서 합산

### 4. 이번 달 변동 내역
| 구분 | 자산명 | 유형 | 월 비용 | 일자 |
|---|---|---|---|---|
| 신규 취득 | ... | | | |
| 반납·폐기 | ... | | | |
| 비용 변경 | ... | | 변경 전→후 | |

### 5. 만료 예정 자산 (다음 달 기준)
- expiryDate 또는 renewalDate 기준
- 담당자 연락처 포함

### 6. 미배정 자산
- assigneeId IS NULL AND orgUnitId IS NULL
- 비용 낭비 식별용

---

## 내보내기 형식

### Excel (.xlsx)
- 시트 구성: 요약 / 유형별 / 부서별 / 변동내역 / 만료예정 / 원본데이터
- 라이브러리: `exceljs` (서버사이드 생성, 클라이언트 전송)
- 응답: `Content-Disposition: attachment; filename=report-YYYY-MM.xlsx`

### PDF
- HTML → PDF 변환 방식 (서버사이드)
- 라이브러리: `@react-pdf/renderer` 또는 `puppeteer`
  - 폐쇄망 제약 고려 → `@react-pdf/renderer` 권장 (외부 의존 없음)
- 응답: `Content-Disposition: attachment; filename=report-YYYY-MM.pdf`

---

## API 스펙

### 보고서 데이터 조회
```
GET /api/reports/monthly?year=2026&month=3&companyId=1
Response 200:
{
  "period": { "year": 2026, "month": 3 },
  "summary": {
    "totalAssets": 87,
    "totalMonthlyCost": { "KRW": 12500000, "USD": 850 },
    "prevMonthCost": { "KRW": 11800000 },
    "expiringCount": 4
  },
  "byType": [ { "type": "SOFTWARE", "count": 32, "monthlyCost": 4200000 }, ... ],
  "byOrgUnit": [ { "orgUnitId": 1, "name": "개발팀", "monthlyCost": 6100000 }, ... ],
  "changes": {
    "added": [ ... ],
    "removed": [ ... ],
    "costChanged": [ ... ]
  },
  "expiring": [ ... ],
  "unassigned": [ ... ]
}
```

### Excel 내보내기
```
GET /api/reports/monthly/export?year=2026&month=3&format=xlsx&companyId=1
Response: Excel 파일 스트림
```

### PDF 내보내기
```
GET /api/reports/monthly/export?year=2026&month=3&format=pdf&companyId=1
Response: PDF 파일 스트림
```

### 보고서 히스토리 (생성된 보고서 목록)
```
GET /api/reports/history?companyId=1
Response 200: [ { "year", "month", "generatedAt", "generatedBy" }, ... ]
```

---

## UI 화면 스펙

### /reports — 보고서 메인
- 현재 월 보고서 자동 표시
- 월 선택기로 과거 보고서 조회
- 내보내기 버튼: Excel / PDF
- 섹션: 요약 카드 → 유형별 파이차트 → 부서별 바차트 → 변동 테이블 → 만료 예정 목록

---

## 구현 순서

> Phase 2 (자산 확장) 완료 후 진행

1. **[BE-030]** `GET /api/reports/monthly` — 보고서 데이터 집계 API
2. **[BE-031]** `exceljs` 설치 + `GET /api/reports/monthly/export?format=xlsx`
3. **[BE-032]** `@react-pdf/renderer` 설치 + `GET /api/reports/monthly/export?format=pdf`
4. **[BE-033]** `GET /api/reports/history`
5. **[FE-020]** `/reports` 보고서 페이지 (차트 + 테이블)
6. **[FE-021]** Excel / PDF 내보내기 버튼

---

## 비고

- 다국 통화 처리: 보고서 내 USD/EUR 자산은 환율 환산 없이 통화별로 별도 표시
- 데이터 스냅샷 저장 여부: Phase 3에서는 실시간 집계. 이후 필요 시 `MonthlyReportSnapshot` 테이블 추가 검토
