# 📍 현재 프로젝트 상태

> 🎯 **Planning Role**이 관리합니다. 다른 모든 Role은 **작업 시작 전 반드시 읽으세요.**
>
> **📚 먼저 읽어야 할 문서**: [`tasks/README.md`](README.md) → [`tasks/VISION.md`](VISION.md) → [`tasks/TICKETS.md`](TICKETS.md)
>
> 최종 업데이트: 2026-03-12 (구현 현황 전수 점검)

---

## 브랜치 현황

| 브랜치 | 상태 | 내용 |
|---|---|---|
| `master` | 기준 브랜치 | Phase 1~4 + 공개 열람 모드 (PR #44까지 머지) |
| `role/planning` | 운영 중 | 기획 문서 전담 |
| `role/backend` | 운영 중 | 백엔드 코드 전담 |
| `role/frontend` | 운영 중 | 프론트엔드 코드 전담 |
| `role/devops` | 운영 중 | 배포/인프라 전담 |
| `role/security` | 운영 중 | 보안 문서 전담 |

> 오픈 PR: **0개** (모든 PR 정리 완료)

---

## 🎯 현재 상태 요약

### 달성률: **95%** (Phase 1~4 기준)

| Phase | 상태 | 비고 |
|---|---|---|
| **Phase 1** — 라이선스 관리 | ✅ 완료 | |
| **Phase 2** — PostgreSQL 전환 + 자산 확장 | ✅ 완료 | |
| **Phase 3 BE** — 월별 보고서 API (BE-030~034) | ✅ 완료 | |
| **Phase 3-1** — 라이선스 계층 구조 (BE-040 + FE-040) | ✅ 완료 | BE + FE 모두 구현됨 |
| **Phase 3 FE** — 보고서 UI (FE-020~022) | ✅ 완료 | |
| **Phase 4 BE** — 증적 DB + API + 배치 | ✅ 완료 | 증적/환율/자산카테고리 |
| **Phase 4 FE** — 증적·환율·자산카테고리 관리 UI | ✅ 완료 | /admin/* 페이지 |
| **BE-050** — GET API 공개 접근 | ✅ 완료 | PR #42 |
| **FE-050** — 공개 열람 모드 (비인증 읽기) | ✅ 완료 | PR #43 |
| **FE-ORG-001** — Company CRUD UI | ✅ 완료 | |
| **FE-001** — 비밀번호 변경 API + UI | ✅ 완료 | |
| **자산 페이지** — Mock → 실제 API | ✅ 완료 | /hardware, /cloud, /domains |
| **Phase 4** — Google Drive 연동 | 🟡 코드 완료 | 외부 OAuth 환경변수 설정만 남음 |
| **EC2 배포** | ⏳ 대기 | 사람이 직접 실행 |

### 🔴 미완료 항목 (잔여 5%)

| 항목 | 유형 | 상세 |
|---|---|---|
| `/contracts` 전용 페이지 | FE | 사이드바에 링크 있으나 전용 UI 미구현 (BE/DB는 완료) |
| Google Drive OAuth | 인프라 | 코드 완료, 환경변수 미설정 |
| EC2 배포 | 인프라 | Docker 설정 완료, 수동 실행 대기 |
| 목록 API 페이지네이션 | BE | `/api/licenses`, `/api/assignments` 등 (현재 `/history`만 지원) |

---

## master에 반영된 기능 (구현 완료)

### 인증 & 공개 열람
- 로그인 / 로그아웃 (세션 쿠키 기반)
- 역할 기반 접근 제어 (ADMIN / USER)
- **공개 열람 모드**: 비인증 사용자도 모든 페이지 읽기 가능, 쓰기만 인증 요구
- `useAuth()` hook (`hooks/useAuth.ts`) — 클라이언트 컴포넌트 인증 상태 확인
- `proxy.ts`: 공개 경로 허용, API POST/PUT/DELETE만 인증 체크
- `mustChangePassword` 강제 비밀번호 변경 UI
- 로그인 브루트포스 방어 (`lib/rate-limit.ts`)

### 라이선스 관리 (Phase 1)
- 라이선스 CRUD (KEY_BASED / VOLUME / NO_KEY)
- 시트(개별 키) 등록·수정, 중복 검사
- 할당 / 반납 / 삭제
- 라이선스 그룹 (기본 그룹 자동 할당)
- 갱신 상태/이력/날짜 관리
- 담당자(Owner) 관리
- **계층 구조 (parentId)**: 부모-자식 관계 + UI 트리 표시

### 자산 관리 (Phase 2)
- `GET|POST /api/assets`, `GET|PUT|DELETE /api/assets/[id]`
- `PATCH /api/assets/[id]/status`, `GET /api/assets/expiring`
- 자산 목록/등록/상세/수정 UI (실제 API 연결)

### 조직 관리
- 부서(OrgUnit) CRUD + 트리 구조
- **회사(Company) CRUD**: `/api/org/companies/[id]`
- 조직도 UI: 회사 생성/수정/삭제 + 부서 트리 편집

### 보고서 (Phase 3)
- 월별 보고서 API: 데이터 집계, Excel, PDF, Email 발송
- 보고서 UI: `/reports`, `/reports/[yearMonth]`, `/reports/settings`

### 증적/환율/자산카테고리 (Phase 4)
- 증적(Archive) CRUD + Export + Google Drive 업로드
- 환율(ExchangeRate) CRUD + 자동 동기화 (외부 API)
- 자산카테고리(AssetCategory) CRUD
- 월별 자동 증적 배치 (`/api/cron/monthly-archive`)
- ADMIN 전용 UI: `/admin/archives`, `/admin/exchange-rates`, `/admin/asset-categories`

### 기타
- 대시보드 차트 (비용 추이, 유형 분포, 누적 성장)
- 감사 로그 조회 `/history`
- CSV 임포트 (라이선스, 조직원, 그룹, 배정)
- 조직원 CRUD + 퇴사 처리 (7일 유예)

---

## DB 스키마 (master 기준) — 15개 모델

| 테이블 | 주요 특징 |
|---|---|
| `License` | `parentId` (계층), 갱신 상태/이력/날짜 |
| `Asset` | SW/Cloud/HW/Domain/Contract/Other, 만료일 관리 |
| `HardwareDetail` | 제조사, 모델, 시리얼, 사양 |
| `CloudDetail` | 플랫폼, 계정, 리전, 시트 수 |
| `ContractDetail` | 계약 유형, 거래처, 자동갱신 |
| `Employee` | 조직 이동, 퇴사 유예 |
| `User` | `mustChangePassword` |
| `OrgCompany` + `OrgUnit` | 회사-부서 계층 구조 |
| `LicenseSeat` | 개별 키 추적 |
| `Assignment` | 라이선스-조직원 매핑 |
| `LicenseGroup` | 그룹별 자동 할당 |
| `ExchangeRate` | 일별 환율 (USD/EUR/JPY/GBP/CNY) |
| `AssetCategory` | Google Drive 폴더 연동 |
| `Archive` + `ArchiveLog` + `ArchiveData` | 월별 증적 스냅샷 |
| `AuditLog` | `actorType`, `actorId` |

---

## 🔴 다음 작업 (Phase 4 잔여 + Phase 5 시작)

### 즉시 처리 — Phase 4 마무리

| 티켓 | Role | 내용 | 난이도 |
|---|---|---|---|
| **FE-060** | Frontend | `/contracts` 전용 페이지 구현 | 🟢 낮음 (1-2일) |
| **BE-P3-03** | Backend | 목록 API 페이지네이션 추가 | 🟡 중간 (2-3일) |
| **OPS-020** | DevOps/사람 | Google Drive OAuth 환경변수 설정 | 🟢 낮음 |
| **OPS-021** | DevOps/사람 | EC2 배포 실행 | 🟢 낮음 |

### Phase 5 — 운영 품질 개선 (80% 이상 달성으로 추가 목표)

> Phase 1~4 달성률 95%로 80% 기준 초과.
> Phase 5 목표: 운영 안정성·사용자 경험·데이터 품질 강화.
> 상세 티켓: `tasks/TICKETS.md` 참조.

| 티켓 | Role | 내용 | 우선순위 |
|---|---|---|---|
| **FE-070** | Frontend | 통합 검색 (라이선스+자산+조직원) | 🔴 Critical |
| **FE-071** | Frontend | 대시보드 자산 통합 (현재 라이선스만) | 🔴 Critical |
| **BE-070** | Backend | 데이터 Export 통합 API (전체 자산 Excel) | 🟠 높음 |
| **BE-071** | Backend | 감사 로그 검색·필터 강화 | 🟠 높음 |
| **BE-072** | Backend | 자산-라이선스 연결 (Asset↔License 매핑) | 🟠 높음 |
| **FE-072** | Frontend | 알림 센터 UI (만료·갱신·변경 알림) | 🟡 중간 |
| **FE-073** | Frontend | 반응형 모바일 최적화 | 🟡 중간 |
| **SEC-010** | Security | 보안 감사 2차 리뷰 (Phase 4 코드) | 🟠 높음 |
| **OPS-030** | DevOps | 헬스체크 + 모니터링 엔드포인트 | 🟡 중간 |

---

### EC2 배포 절차 (사람이 직접 실행)

```powershell
# [1단계] 로컬 Windows에서 실행
.\deploy.ps1   # git push + S3 업로드 자동
```

```bash
# [2단계] EC2 SSM 접속 후 실행
aws ssm start-session --target i-03b9c1979ef4a2142 --region ap-northeast-2 --profile hyeongunk

cd /home/ssm-user/app
aws s3 cp s3://triplecomma-releases/triplecomma-backoffice/asset-manager.zip .
sudo rm -rf asset-manager
sudo mkdir -p asset-manager && sudo chown -R ssm-user:ssm-user asset-manager
unzip -q asset-manager.zip -d asset-manager && rm asset-manager.zip
cd asset-manager

# 디스크 공간 확보
sudo docker system prune -a -f

sudo docker-compose down 2>/dev/null || true
sudo docker-compose build
sudo docker-compose up -d

# DB 스키마 동기화 (새 테이블 추가됨)
sudo docker exec license-app sh -c "npx prisma db push"
```

### Google Drive 연동 완성
- 환경변수 설정 필요: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- 설정 후 증적 Export 기능 자동 활성화

---

## 📊 구현 현황 수치 (2026-03-12 기준)

| 항목 | 수치 |
|---|---|
| API 라우트 | 62개 |
| DB 모델 | 15개 |
| 페이지 | 25개+ |
| 배치 작업 | 6개 |
| TODO/FIXME 주석 | 0개 |
| 코드 품질 부채 | 없음 |

---

## 📚 문서 가이드

| Role | 참고 문서 |
|---|---|
| **Planning** | `tasks/VISION.md`, `tasks/TICKETS.md` |
| **Backend** | `tasks/TICKETS.md`, `tasks/api-spec.md` |
| **Frontend** | `tasks/TICKETS.md`, `hooks/useAuth.ts` |
| **DevOps** | `CLAUDE.md`, `tasks/troubleshooting.md` |
| **Security** | `tasks/security/guidelines.md` |
