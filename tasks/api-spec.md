# API 스펙 (계약서)

> 기획 세션(/project:planning)에서 정의한다.
> 프론트엔드와 백엔드 세션은 이 스펙을 기준으로 개발한다.
> 스펙 변경이 필요하면 tasks/feedback/에 요청을 작성한다.

## 인증

### POST /api/auth/login
- 요청: `{ username: string, password: string }`
- 응답 200: `{ user: { id, username, role } }`
- 응답 401: `{ error: "Invalid credentials" }`

### POST /api/auth/logout
- 요청: (없음, 세션 쿠키로 식별)
- 응답 200: `{ success: true }`

## 조직원 (Employees)

(기획 세션에서 정의)

## 라이선스 (Licenses)

(기획 세션에서 정의)

## 할당 (Assignments)

(기획 세션에서 정의)
