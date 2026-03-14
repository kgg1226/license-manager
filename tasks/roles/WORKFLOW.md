# 🎯 Asset Manager — 협력 워크플로우

> **목적**: 이 문서는 새로운 개발자가 Asset Manager 프로젝트의 작업 방식을 이해하고, 다른 로컬 환경에서도 동일한 프로세스를 따를 수 있도록 안내합니다.
>
> **작성일**: 2026-03-08
> **버전**: 1.0

---

## 🌍 프로젝트 구조

### 개요
```
asset-manager/
├── app/                      ← Next.js App Router
│   ├── api/                  ← API Routes
│   ├── assets/               ← Asset 관리 페이지
│   ├── licenses/             ← License 관리 페이지
│   └── ...
├── prisma/                   ← Database Schema
│   └── schema.prisma
├── lib/                       ← Shared Utilities
├── .claude/
│   └── worktrees/            ← 역할별 독립 작업공간
│       ├── ecstatic-sanderson/     (Backend)
│       ├── gracious-williamson/    (Frontend)
│       ├── xenodochial-brattain/   (DevOps)
│       ├── mystifying-bose/        (Security)
│       └── gracious-ritchie/       (Planning)
└── tasks/                    ← 프로젝트 관리 문서
    ├── VISION.md             ← 전체 목표 (Phase 1~5)
    ├── TICKETS.md            ← 활성 티켓
    ├── README.md             ← 문서 가이드
    ├── WORKFLOW.md           ← 이 파일
    ├── BACKEND-PHASE2-START.md
    ├── FRONTEND-PHASE2-START.md
    ├── DEVOPS-PHASE2-START.md
    ├── SECURITY-PHASE2-START.md
    ├── phase2-db-design.md
    └── security/
        ├── guidelines.md     ← 보안 정책
        └── code-review.md
```

---

## 👥 5가지 역할 (Role-Based Sessions)

이 프로젝트는 **5가지 역할**로 분리되어 독립적으로 작업합니다:

| 역할 | 명령어 | Worktree | Branch | 책임 |
|------|--------|---------|--------|------|
| 🎯 **Planning** | `/planning` | gracious-ritchie | claude/gracious-ritchie | 문서, 일정, 조율 |
| 🎨 **Frontend** | `/frontend` | gracious-williamson | claude/gracious-williamson | UI/UX 구현 |
| 🔧 **Backend** | `/backend` | ecstatic-sanderson | claude/ecstatic-sanderson | API 구현 |
| 🚀 **DevOps** | `/devops` | xenodochial-brattain | claude/xenodochial-brattain | 배포, 인프라 |
| 🔒 **Security** | `/security` | mystifying-bose | claude/mystifying-bose | 보안, Code Review |

---

## 🚀 워크플로우 (나의 하루)

### 1️⃣ **역할 전환** (아침 시작)

```bash
# 현재 역할 확인 (master에 있으면 Planning)
git rev-parse --abbrev-ref HEAD

# Backend 역할로 전환
/backend

# ===== 자동으로 표시되는 정보 =====
# 🔧 Backend 역할 (ecstatic-sanderson)
# 📋 할당 작업: BE-020~025 (6개)
# ⏱️  예상 기간: 1-2주
# 📚 시작 문서: cat tasks/roles/BACKEND-PHASE2-START.md
# 🎯 다음 할 일: BE-020 (Asset Schema) 부터 시작
# ===============================
```

### 2️⃣ **티켓 확인**

```bash
# 내 할당 작업 읽기
cat tasks/TICKETS.md | grep "BE-0"

# 또는 역할별 START.md 읽기
cat tasks/roles/BACKEND-PHASE2-START.md

# 결과:
# - BE-020: Asset Schema (1-2일, Critical)
# - BE-021: GET|POST /api/assets (1-2일)
# - ...
```

### 3️⃣ **작업 시작**

```bash
# 첫 번째 티켓 (BE-020)의 상세 명세 확인
cat tasks/TICKETS.md  # BE-020 섹션 보기

# 또는 기술 스펙 확인
cat tasks/phase2-db-design.md  # Asset Schema 정의

# 작업 시작
npm run dev  # Dev server

# 코드 작성...
git add .
git commit -m "feat: BE-020 구현"
git push origin claude/ecstatic-sanderson
```

### 4️⃣ **완료 & 병합**

```bash
# PR 생성 (자동 또는 수동)
gh pr create --title "feat: BE-020 Asset Schema 구현" \
  --body "..."

# Code Review 대기 (Security 역할이 검증)

# Merge 후 master에 자동 반영
```

---

## 📋 명령어 참고서

### 역할 전환
```bash
/planning        # Planning 역할 (문서 관리)
/backend         # Backend 역할 (API 구현)
/frontend        # Frontend 역할 (UI 구현)
/devops          # DevOps 역할 (배포)
/security        # Security 역할 (보안, Code Review)
```

### 일반 명령어
```bash
# 현재 branch 확인
git rev-parse --abbrev-ref HEAD

# 최근 커밋 확인
git log --oneline -10

# 모든 worktree 상태 확인
git worktree list

# PR 목록
gh pr list --state open
```

---

## 📚 문서 체계

### 필독 문서 (모두)
| 문서 | 목적 |
|------|------|
| **VISION.md** | 전체 목표 및 5단계 로드맵 |
| **TICKETS.md** | 활성 티켓 (자신의 할당 작업 확인) |
| **README.md** | 각 역할이 참고할 문서 |
| **WORKFLOW.md** | 이 문서 (협력 방식) |

### 역할별 START.md
| 역할 | 문서 |
|------|------|
| Backend | `BACKEND-PHASE2-START.md` (5분 가이드) |
| Frontend | `FRONTEND-PHASE2-START.md` (5분 가이드) |
| DevOps | `DEVOPS-PHASE2-START.md` (5분 가이드) |
| Security | `SECURITY-PHASE2-START.md` (5분 가이드) |

### 기술 문서
| 문서 | 내용 |
|------|------|
| **phase2-db-design.md** | DB 스키마, 마이그레이션 |
| **api-spec.md** | API 엔드포인트 명세 |
| **security/guidelines.md** | 보안 정책, ISMS-P |
| **security/code-review.md** | Code Review 체크리스트 |

---

## 🔄 자동화 메커니즘

### Post-Checkout Hook
**파일**: `.git/hooks/post-checkout`

**동작**:
1. Worktree 전환 후 자동 실행
2. tasks/ 폴더 동기화 (master의 최신 파일)
3. 역할 정보 자동 표시

**결과**: 역할 전환 시 항상 최신 문서 + 역할 정보 제공 ✅

### Tasks 동기화
**스크립트**: `scripts/init-worktree.sh`, `scripts/sync-tasks.sh`

**동작**:
```bash
# 개별 worktree 초기화
./scripts/init-worktree.sh

# 또는 모든 worktree 동기화
./scripts/sync-tasks.sh
```

---

## 📊 진행 상황 추적

### Planning 역할의 책임
```bash
# 각 worktree 진행 상황 확인
cd .claude/worktrees/ecstatic-sanderson && git log --oneline -5
cd .claude/worktrees/gracious-williamson && git log --oneline -5
# ...

# 또는 모든 branch 한눈에
git log --all --oneline --graph -20
```

### 각 역할의 체크리스트
- Backend: BACKEND-PHASE2-START.md의 완료 기준 확인
- Frontend: FRONTEND-PHASE2-START.md의 완료 기준 확인
- DevOps: DEVOPS-PHASE2-START.md의 완료 기준 확인
- Security: SECURITY-PHASE2-START.md의 완료 기준 확인

---

## 🎯 Phase 2 예시 (2026-03-07 ~ 2026-03-28)

### Week 1
```bash
/backend
# BE-020: Asset Schema 추가 (1-2일)
# BE-021: GET|POST /api/assets (1-2일)
# BE-022: GET|PUT|DELETE /api/assets/[id] (1-2일)

/devops
# OPS-010: Docker 업데이트 (0.5-1일)
# OPS-011: 마이그레이션 검증 (1-2일)

/security
# SEC-101: 접근 제어 정책 (1-2일)
# SEC-102: 입력 검증 규칙 (1-2일)
```

### Week 2
```bash
/frontend (BE-020 완료 후)
# FE-010: Asset 목록 페이지 (2-3일)
# FE-011: 등록/수정 폼 (2-3일)

/backend
# BE-023~025: 나머지 API (3일)

/security
# SEC-103/104: Code Review (병렬 진행)
```

### Week 3
```bash
# 통합 테스트
# 배포 준비
# SEC-105: ISMS-P 컴플라이언스 감사
```

---

## ✅ 완료 기준

### 각 역할이 완료되려면
1. ✅ 할당 작업 모두 구현
2. ✅ Code Review 통과 (Security 역할 승인)
3. ✅ PR merge 완료
4. ✅ 테스트 통과
5. ✅ 문서 작성 완료

### Phase 2 완료
모든 역할의 작업이 완료되면 배포 준비

---

## 🆘 문제 해결

### Q: tasks/ 폴더가 없어요
```bash
# 수동 동기화
./scripts/init-worktree.sh
```

### Q: 역할 정보가 안 나와요
```bash
# post-checkout hook 재실행
# worktree 재전환 또는:
git checkout --force HEAD
```

### Q: 다른 역할의 작업을 봐야 해요
```bash
# master로 이동 (모든 파일 접근 가능)
git checkout master

# 또는 다른 worktree로 이동
cd .claude/worktrees/[role]
```

### Q: PR이 merge 안 됐어요
```bash
# Planning 역할이 병합 상황을 추적합니다
/planning
git log --all --oneline --graph -20
```

---

## 📌 주의사항

### ❌ 하지 말아야 할 것
- ❌ master branch에서 코드 작성 (worktree 사용)
- ❌ 다른 역할의 branch에서 작업 (역할 전환 후 작업)
- ❌ tasks/ 폴더 수정하고 커밋 (Planning 역할만)
- ❌ 보안 정책 무시하고 코딩 (guidelines.md 확인)

### ✅ 항상 해야 할 것
- ✅ 작업 전 `cat tasks/TICKETS.md` 확인
- ✅ 역할별 START.md 읽기
- ✅ Code Review 통과 후 merge
- ✅ 완료 후 next 역할에 보고 (Planning)

---

## 🚀 시작하기

### 새로운 환경에서
```bash
# 1. 프로젝트 clone
git clone https://github.com/kgg1226/asset-manager.git
cd asset-manager

# 2. 이 문서 읽기
cat tasks/roles/WORKFLOW.md

# 3. 역할 선택 후 진입
/backend        # (예: Backend 역할)

# 4. 자동으로 표시되는 정보 확인
# 5. START.md 읽기
cat tasks/roles/BACKEND-PHASE2-START.md

# 6. 할당 작업 시작!
```

---

## 💡 이 워크플로우의 장점

| 장점 | 설명 |
|------|------|
| **명확한 책임** | 각 역할이 정확히 뭘 해야 할지 안다 |
| **자동화** | 역할 진입 시 필요한 정보 자동 제공 |
| **독립성** | 각 역할이 독립적으로 작업 가능 |
| **협력** | Code Review로 품질 보증 |
| **추적성** | 모든 작업이 git으로 기록됨 |
| **확장성** | 새로운 단계도 동일한 방식으로 진행 |

---

## 📞 도움이 필요하면

1. **문서 확인**: VISION.md, README.md, 역할별 START.md
2. **Planning 역할에 물어보기**: 일정, 우선순위, 의존성
3. **Security 역할에 물어보기**: 보안 정책, 접근 제어

---

**이 워크플로우를 따르면, 모든 개발자가 동일한 방식으로 작업할 수 있습니다!** 🎯
