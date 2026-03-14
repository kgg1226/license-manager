# Asset Manager

사내 **정보자산(소프트웨어 라이선스·클라우드·하드웨어·도메인 등)**을 등록·할당·회수·이력 관리하기 위한 Next.js 기반 웹 애플리케이션입니다.

## 왜 이 프로젝트 구조를 쓰는가

이 저장소는 단순 코드 저장소가 아니라, 운영/배포/보안 품질까지 포함한 **협업 운영 체계**를 함께 관리합니다.

- 역할 분리된 작업 방식(기획/프론트/백엔드/DevOps/보안)
- API/DB 변경의 사전 합의 문서화
- 에러 재발 방지를 위한 포스트모템 축적
- 폐쇄망·저사양 EC2 환경 제약을 고려한 배포 규칙

핵심 의도는 “기능 구현”과 “운영 안정성”을 동시에 유지하는 것입니다.

## 기술 스택

- Next.js App Router
- Prisma + SQLite
- React
- Tailwind CSS
- Docker (EC2 배포)

## 역할 기반 세션 운영 (중요)

역할별 작업 규칙은 아래 문서로 관리합니다.

- `CLAUDE.md`
- `.claude/commands/backend.md`
- `.claude/commands/frontend.md`
- `.claude/commands/devops.md`
- `.claude/commands/planning.md`
- `.claude/commands/security.md`

### 기본 원칙

1. 역할 진입 전에는 코드 수정 금지
2. 보안 가이드 변경 시 다른 역할은 작업 전 반드시 재확인
3. 스펙/명세 변경 없이 구현을 먼저 바꾸지 않기

## 문서 체계 (작업 전에 먼저 확인)

### 1) 작업/기획

- `tasks/todo.md` : 현재 작업 상태
- `tasks/features/` : 기능 명세
- `tasks/lessons.md` : 누적된 핵심 교훈

### 2) 계약/명세

- `tasks/api-spec.md` : API 계약서
- `tasks/db-changes.md` : DB 변경 명세

### 3) 보안

- `tasks/security/guidelines.md` : 보안 개발 기준
- `tasks/security/threat-model.md` : 위협 모델 및 우선순위

### 4) 포스트모템

- `tasks/postmortem/README.md` : 작성 규칙
- `tasks/postmortem/db.md`
- `tasks/postmortem/docker.md`
- `tasks/postmortem/frontend.md`
- `tasks/postmortem/infra.md`

## 시작하기

### 로컬 개발

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

### 프로덕션 빌드

```bash
npm run build
npm run start
```

## 배포/인프라 가이드

- 인프라 예시 환경변수: `.env.infra.example`
- 실제 인프라 값은 `.env.infra` 로컬 파일 사용 (Git 추적 금지)
- 폐쇄망 환경에서는 런타임 외부 호출(외부 API/CDN) 금지

## 운영 시 자주 발생하는 실수

1. 스펙(`tasks/api-spec.md`) 미반영 상태로 API 선구현
2. DB 변경 명세 없이 스키마/쿼리 직접 수정
3. 에러 해결 후 포스트모템 미기록
4. 보안 가이드 미확인 상태로 기능 추가

이 저장소의 규칙은 위 실수를 줄이기 위해 설계되었습니다.
