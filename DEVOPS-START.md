# 🟢 DevOps Role — 시작하기

> **이 파일은 DevOps를 위한 빠른 시작 가이드입니다.**
>
> 🎯 **목표**: OPS-010/011/001/002 완료 (2-3일)

---

## ⚡ 지금 바로 해야 할 일 (5분)

### 1️⃣ Master 브랜치 최신화
```bash
cd /c/license-manager
git checkout master
git pull origin master
```

### 2️⃣ DevOps 티켓 보기
```bash
# 이 파일을 엽니다:
tasks/TICKETS.md
```

**찾아야 할 섹션**: `🔧 DEVOPS 티켓`

### 3️⃣ 할당된 작업 확인

```
🎫 OPS-010: deploy.sh / docker-compose.yml — SQLite 볼륨 제거
   예상 시간: 1-2일
   난이도: 🟡 중간

🎫 OPS-011: .env.example 생성
   예상 시간: 0.5일
   난이도: 🟢 낮음

🎫 OPS-001: dockerfile — 비root USER 추가
   예상 시간: 0.5일
   난이도: 🟢 낮음

🎫 OPS-002: .dockerignore 점검
   예상 시간: 0.5일
   난이도: 🟢 낮음
```

---

## 📚 읽어야 할 문서 (우선순위 순)

### 1️⃣ **`tasks/TICKETS.md`** ← 지금 바로 읽기
- 페이지 오픈
- "🔧 DEVOPS 티켓" 섹션 찾기
- 각 티켓의 "참고 파일" 목록 확인
- **요구사항** 섹션 읽기

### 2️⃣ **`CLAUDE.md`**
- 프로덕션 배포 고려사항
- 프로젝트 스택 정보
- 포트 설정 (3000)

### 3️⃣ **`.claude/launch.json`**
- Dev server 설정 (참고용)

### 4️⃣ **기존 파일 검토**
- `dockerfile`
- `docker-compose.yml`
- `deploy.ps1`

---

## 🚀 구현 순서 (병렬 가능)

### Step 1: OPS-011 (.env.example) — 30분
```
파일: 프로젝트 루트/.env.example (신규 생성)

내용:
DATABASE_URL=postgresql://user:password@host:5432/database_name
CRON_SECRET=your-secret-key-here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
...
(자세한 목록은 TICKETS.md 참고)
```

**TICKETS.md OPS-011 "요구사항" 섹션 참고**

### Step 2: OPS-001 (dockerfile) — 30분
```
파일: dockerfile

추가할 것:
RUN useradd -m -u 1001 appuser
USER appuser
```

**TICKETS.md OPS-001 "요구사항" 섹션 참고**

### Step 3: OPS-002 (.dockerignore) — 30분
```
파일: .dockerignore (검토)

확인할 것:
- .env
- .env.local
- dev.db*
- *.zip
- .git
...
(자세한 목록은 TICKETS.md 참고)
```

**TICKETS.md OPS-002 "요구사항" 섹션 참고**

### Step 4: OPS-010 (Docker 설정) — 1-2일
```
파일: deploy.sh 또는 docker-compose.yml

제거할 것:
- SQLite 볼륨 마운트 (-v /home/.../dev.db:/app/dev.db)
- SQLite 환경변수 (DATABASE_URL=file:/app/dev.db)

추가할 것:
- PostgreSQL 연결 문자열 (DATABASE_URL=postgresql://...)
- 환경변수 주입 방식 (SSM Parameter Store 또는 .env)
```

**TICKETS.md OPS-010 "요구사항" 섹션 참고**

---

## 📝 기술 참고사항

### 파일 위치
```
프로젝트 루트/
├─ dockerfile
├─ docker-compose.yml (또는 deploy.sh)
├─ .dockerignore
├─ .env.example (신규)
├─ CLAUDE.md (참고용)
└─ .claude/launch.json (참고용)
```

### Docker 비root USER 패턴
```dockerfile
# Non-root user 생성
RUN useradd -m -u 1001 appuser

# User 전환
USER appuser
```

### 환경변수 관리
```bash
# .env.example: 실제 값 없이 키만 나열
DATABASE_URL=postgresql://...
CRON_SECRET=

# 실제 배포 시: SSM Parameter Store 또는 .env 파일 사용
```

---

## ✅ 완료 체크리스트

### OPS-011 (.env.example)
- [ ] 파일 생성
- [ ] 모든 필수 환경변수 포함
- [ ] 주석 추가 (각 변수 설명)
- [ ] Git에 커밋

### OPS-001 (dockerfile)
- [ ] 비root USER 지시문 추가
- [ ] 테스트 환경에서 검증
- [ ] 기존 기능 영향 없음 확인
- [ ] Git에 커밋

### OPS-002 (.dockerignore)
- [ ] 필요한 항목 모두 포함
- [ ] 불필요한 파일 제외 확인
- [ ] 이미지 크기 최적화
- [ ] Git에 커밋

### OPS-010 (deploy.sh / docker-compose.yml)
- [ ] SQLite 설정 제거 완료
- [ ] PostgreSQL 연결 문자열 설정
- [ ] 테스트 환경에서 검증
- [ ] 배포 스크립트 정상 작동
- [ ] Git에 커밋

---

## 🔗 참고 파일

| 파일 | 설명 |
|------|------|
| `CLAUDE.md` | 프로젝트 개요, 배포 고려사항 |
| `dockerfile` | 현재 Docker 이미지 설정 |
| `docker-compose.yml` | Docker 컴포즈 설정 |
| `deploy.ps1` | 배포 스크립트 (Windows PowerShell) |
| `.claude/launch.json` | Dev server 설정 (참고용) |

---

## 📌 중요: Supabase 전환 확인

**OPS-010 작업 전에 확인**:
```
- Supabase PostgreSQL 설정 완료? ✅
- DATABASE_URL 준비됨? ✅
- 로컬에서 Supabase 연결 테스트됨? ✅
```

**현재 상태**: Supabase 전환 완료 (Phase 1)

---

## ❓ 질문이 있으면?

**TICKETS.md에서 세부사항 확인**:
- "요구사항" 섹션: 구현해야 할 것
- "참고 파일" 섹션: 영향 받는 파일
- "완료 조건" 섹션: 검증 기준

**CLAUDE.md 확인**:
- 프로덕션 배포 고려사항
- 포트, 환경변수 등

**막히면 Planning Role에 보고**:
- TICKETS.md 업데이트 요청
- 배포 설정 명확화 요청

---

## 🎯 Success Criteria

**2-3일 내 다음이 완료되어야 합니다**:

✅ .env.example 생성 완료
✅ dockerfile 비root USER 추가 완료
✅ .dockerignore 최적화 완료
✅ deploy.sh/docker-compose.yml SQLite 제거 완료
✅ PostgreSQL 연결 정상 작동
✅ 로컬 & 테스트 환경에서 배포 검증
✅ 모든 설정 Git에 커밋

---

## 🚀 배포 준비도

현재 상태:
- ✅ Code: Backend/Frontend 작업 중
- ✅ DB: Supabase 전환 완료
- ⏳ DevOps: 설정 최종화 필요 (지금 진행 중)
- 🔴 Deploy: OPS-010/011/001/002 완료 후 가능

---

**이제 `tasks/TICKETS.md`를 열어서 OPS-011부터 시작하세요!** 🚀

OPS-010이 가장 복잡하니, OPS-011/001/002를 먼저 빠르게 완료한 후
OPS-010에 집중하면 됩니다.
