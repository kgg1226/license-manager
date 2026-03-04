# License Manager

## 프로젝트 개요
사내 소프트웨어 라이선스 관리 웹 앱 (등록·할당·회수·이력 관리).
- 스택: Next.js 15 App Router + Prisma 7 + better-sqlite3 + Tailwind CSS 4
- 인증: 자체 구현 (세션 쿠키 + bcryptjs), 역할: ADMIN / USER
- DB: SQLite (`dev.db`), Prisma 클라이언트 출력 경로 → `generated/prisma/`
- 배포: Docker, AWS EC2 (ARM64), 폐쇄망
- 포트: 호스트 8080 → 컨테이너 3000

## 세션 역할 체제
이 프로젝트는 5개 역할로 분리 운영된다:
- 🎯 기획: `/planning` 으로 진입
- 🎨 프론트엔드: `/frontend` 으로 진입
- ⚙️ 백엔드: `/backend` 으로 진입
- 🔧 DevOps: `/devops` 으로 진입
- 🔒 보안: `/security` 으로 진입

역할 진입 전에는 코드를 수정하지 않는다.
보안 세션이 `tasks/security/guidelines.md`를 업데이트하면, 다른 역할 세션은 작업 전 반드시 확인한다.

## 필수 참조 파일
- 작업 시작 전: `tasks/todo.md`, `tasks/lessons.md` 확인
- 코드 작성 전: `tasks/security/guidelines.md` 보안 규칙 확인
- 에러 해결 후: `tasks/postmortem/` 해당 카테고리에 기록
- API 구현/호출: `tasks/api-spec.md` 준수
- DB 변경: `tasks/db-changes.md` 참조
- 인프라 접속 정보: `.env.infra` 참조 (Git 미추적, 로컬 전용)

## 폐쇄망 제약
- 런타임에 외부 URL 호출 금지
- 외부 CDN 의존 금지 (Google Fonts 등 포함)
- 모든 라이브러리는 `npm install`로 번들에 포함

## 빌드 주의사항
- EC2 ARM64, RAM 제한 환경 — 빌드 전 스왑 확인 필수 (`free -h`)
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경은 호스트에서 `sqlite3`로 직접 SQL 실행
- `prisma generate` 결과물은 `generated/prisma/`에 위치 (`lib/prisma.ts`에서 import)

## 주요 디렉토리
```
app/
  api/          ← API Route (백엔드 전담)
  (pages)/      ← 페이지 컴포넌트 (프론트엔드 전담)
components/     ← 공용 UI 컴포넌트
lib/            ← 서버 사이드 로직 (auth.ts, prisma.ts 등)
prisma/
  schema.prisma ← DB 스키마 정의
generated/
  prisma/       ← Prisma 클라이언트 (자동 생성, 수정 금지)
tasks/          ← 기획/보안/운영 문서 전체
```
