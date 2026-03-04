# License Manager

## 프로젝트 개요
사내 소프트웨어 라이선스 관리 웹 앱.
- 스택: Next.js 15 App Router + Prisma 7 + better-sqlite3 + Tailwind CSS 4
- 인증: 자체 구현 (세션 쿠키 + bcryptjs)
- DB: SQLite (파일 기반)
- 배포: Docker, AWS EC2 (ARM64), 폐쇄망

## 세션 역할 체제
이 프로젝트는 5개 역할로 분리 운영된다:
- 🎯 기획: /project:planning 으로 진입
- 🎨 프론트엔드: /project:frontend 으로 진입
- ⚙️ 백엔드: /project:backend 으로 진입
- 🔧 DevOps: /project:devops 으로 진입
- 🔒 보안: /project:security 으로 진입

역할 진입 전에는 코드를 수정하지 않는다.
보안 세션이 tasks/security/guidelines.md를 업데이트하면, 다른 역할 세션은 작업 전 반드시 확인한다.

## 필수 참조 파일
- 작업 시작 전: tasks/todo.md, tasks/lessons.md 확인
- 코드 작성 전: tasks/security/guidelines.md 보안 규칙 확인
- 에러 해결 후: tasks/postmortem/ 해당 카테고리에 기록
- API 구현/호출: tasks/api-spec.md 준수
- DB 변경: tasks/db-changes.md 참조
- 인프라 접속 정보: .env.infra 참조 (Git 미추적)

## 폐쇄망 제약
- 런타임에 외부 URL 호출 금지
- 외부 CDN 의존 금지
- 모든 라이브러리는 npm install로 번들에 포함

## 빌드 주의사항
- EC2 RAM 제한 — 빌드 전 스왑 확인 필수 (free -h)
- 프로덕션 컨테이너에서 prisma CLI 실행 금지
- DB 스키마 변경은 호스트에서 sqlite3로 직접 SQL 실행
