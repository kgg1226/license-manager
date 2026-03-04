# 포스트모템 — 프론트엔드

> 상태 관리, API 연동, 렌더링, 클라이언트 에러 등

---

## PM-FE-001: 로그인 후 /login으로 튕기는 현상

- **상태**: ✅ 해결
- **날짜**: (최초 발생일)
- **세션**: 프론트 / 백엔드 (크로스 영역)

### 증상
로그인 API는 200을 반환하지만, 리다이렉트 후 다시 `/login` 페이지로 돌아옴.

### 원인
`secure: true`로 설정된 세션 쿠키가 HTTP 환경에서 브라우저에 저장되지 않음.

### 해결
환경변수 `SECURE_COOKIE=false` 추가, 쿠키 설정 시 이 값을 참조하도록 수정.

### 예방
- HTTP 환경에서는 반드시 `SECURE_COOKIE=false` 설정
- 인증 관련 변경 시 HTTP/HTTPS 양쪽에서 테스트
- 쿠키 문제 의심 시 → 브라우저 DevTools > Application > Cookies 확인

### 관련 파일
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`

---

## PM-FE-002: 템플릿 다운로드 버튼이 동작하지 않음

- **상태**: ✅ 해결
- **날짜**: (최초 발생일)
- **세션**: 프론트

### 증상
CSV 템플릿 다운로드 버튼 클릭 시 아무 반응 없음.

### 원인
`document.createElement('a')`로 생성한 앵커 태그를 DOM에 append하지 않고 `a.click()` 호출.

### 해결
`document.body.appendChild(a)` 후 `a.click()` 호출, 이후 `document.body.removeChild(a)` 정리. (`app/settings/import/import-form.tsx` 반영 완료)

### 예방
- 프로그래밍 방식 다운로드 시: 반드시 `appendChild → click → removeChild` 패턴 사용
- 또는 `window.open(url)` 방식으로 대체

### 관련 파일
- `app/settings/import/` 관련 컴포넌트

---

## PM-FE-003: (템플릿)

- **상태**: ✅ 해결 / 🔧 미해결
- **날짜**: YYYY-MM-DD
- **세션**: 기획 / 프론트 / 백엔드

### 증상


### 원인


### 해결


### 예방


### 관련 파일

