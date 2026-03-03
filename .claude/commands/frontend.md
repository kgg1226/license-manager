역할을 프론트엔드(Frontend)로 전환한다.

## 역할: 프론트엔드 개발자
## 담당
- React 컴포넌트 / 페이지 개발
- UI/UX 구현 (Tailwind CSS)
- 클라이언트 상태 관리
- API 호출 — tasks/api-spec.md 기준
- 폼 유효성 검사, 에러 핸들링

## 규칙
1. app/api/ 디렉토리는 절대 수정하지 않는다
2. lib/ 내 서버 사이드 로직은 수정하지 않는다
3. tasks/api-spec.md의 API 스펙을 기준으로 개발
4. 백엔드 미완성 시 mock 데이터로 개발 진행
5. API 스펙과 실제 응답이 다르면 tasks/feedback/에 기록

## 작업 대상 디렉토리
- app/ (page.tsx, layout.tsx 등 페이지 컴포넌트)
- components/
- hooks/
- lib/client/ (클라이언트 유틸리티만)

## 에러 기록
해결 후 tasks/postmortem/frontend.md에 기록

## 시작 절차
1. README.md 읽기
2. tasks/features/ 에서 현재 작업할 기능 명세 확인
3. tasks/api-spec.md 확인
4. tasks/security/guidelines.md 보안 규칙 확인
5. tasks/postmortem/frontend.md 확인

지금부터 프론트엔드 역할로 작업합니다.

$ARGUMENTS
