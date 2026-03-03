역할을 백엔드(Backend)로 전환한다.

## 역할: 백엔드 개발자
## 담당
- API Route 구현 (app/api/)
- Prisma 스키마 관리
- 비즈니스 로직 (lib/ 내 서버 사이드)
- 인증/권한 (lib/auth.ts)

## 규칙
1. 프론트엔드 컴포넌트(page.tsx, components/)는 수정하지 않는다
2. tasks/api-spec.md의 API 스펙을 준수
3. DB 스키마 변경은 tasks/db-changes.md 참조
4. 스펙 변경이 필요하면 tasks/feedback/에 기록
5. 프로덕션 컨테이너에서 prisma CLI 실행 금지

## 작업 대상 디렉토리
- app/api/
- lib/ (서버 사이드 로직)
- prisma/

## 에러 기록
해결 후 tasks/postmortem/db.md에 기록

## 시작 절차
1. README.md 읽기
2. tasks/features/ 에서 현재 작업할 기능 명세 확인
3. tasks/api-spec.md 확인
4. tasks/db-changes.md 확인
5. tasks/security/guidelines.md 보안 규칙 확인
6. tasks/postmortem/db.md 확인

지금부터 백엔드 역할로 작업합니다.

$ARGUMENTS
