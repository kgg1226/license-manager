# 🔒 Security Phase 2 빠른 시작 가이드

> **역할**: Security (/security)
> **Phase**: Phase 2 — Asset Management Abstraction
> **기간**: 2026-03-07 ~ 2026-03-28 (3주)
> **목표**: Asset 관리 보안 정책 및 취약점 분석

---

## ⚡ 5분 안에 시작하기

### 1. 문서 확인 (필독)
```bash
# 보안 정책
cat tasks/security/guidelines.md       # ISMS-P 컴플라이언스 규칙
cat tasks/VISION.md                    # ISO27001 보안 요구사항

# 코드 리뷰 가이드
cat tasks/security/code-review.md      # 보안 코드 리뷰 체크리스트

# 기본 가이드
cat SECURITY-START.md                  # Security 역할 가이드
```

### 2. Branch 전환
```bash
# Planning 역할 worktree에서 Security 역할로 전환
/security

# 또는 수동 worktree 전환
cd /c/asset-manager/.claude/worktrees/[role]/
```

### 3. Phase 2 코드 리뷰 준비
```bash
# Backend BE-020~025 코드 리뷰 대기
# Frontend FE-010~012 코드 리뷰 대기
git log --oneline origin/master -20  # 최근 커밋 확인
```

---

## 🎯 Phase 2 Security 작업 (5개)

| 순번 | 작업 | 제목 | 난이도 | 예상 기간 | 상태 |
|------|------|------|--------|---------|------|
| 1 | **SEC-101** | Asset API 접근 제어 정책 정의 | 🟡 중간 | 1-2일 | 🔴 오픈 |
| 2 | **SEC-102** | Asset API 입력 검증 규칙 | 🟡 중간 | 1-2일 | 🔴 오픈 |
| 3 | **SEC-103** | Code Review: Backend (BE-020~025) | 🟠 어려움 | 2-3일 | 🔴 오픈 |
| 4 | **SEC-104** | Code Review: Frontend (FE-010~012) | 🟠 어려움 | 2-3일 | 🔴 오픈 |
| 5 | **SEC-105** | ISMS-P 컴플라이언스 감사 | 🟠 어려움 | 1-2일 | 🔴 오픈 |

**💡 추천 순서**: SEC-101 → SEC-102 → SEC-103 → SEC-104 → SEC-105

---

## 📋 작업 상세 요약

### **SEC-101: Asset API 접근 제어 정책 정의** 🟡 중간

**목표**: Asset 리소스의 역할 기반 접근 제어(RBAC) 정책 수립

**파일**: `tasks/security/guidelines.md` (업데이트)

**구현 내용**:

1. **역할별 권한 매트릭스**
   ```
   리소스         | ADMIN | USER  | GUEST
   ─────────────────────────────────────
   Asset 조회     | ✅    | ✅    | ❌
   Asset 생성     | ✅    | ✅    | ❌
   Asset 수정     | ✅    | ⚠️*   | ❌  (* 자신의 자산만)
   Asset 삭제     | ✅    | ❌    | ❌
   Asset 상태변경 | ✅    | ✅    | ❌
   비용 분석      | ✅    | ✅    | ❌
   감사 로그 조회 | ✅    | ✅    | ❌
   ```

2. **접근 제어 규칙**
   - `GET /api/assets` → 로그인 필수
   - `POST /api/assets` → ADMIN 또는 자산 관리 권한 필요
   - `PUT /api/assets/[id]` → ADMIN 또는 자산 소유자
   - `DELETE /api/assets/[id]` → ADMIN만
   - `PATCH /api/assets/[id]/status` → ADMIN 또는 자산 관리 권한

3. **구현 방식**
   ```typescript
   // app/api/assets/route.ts
   export async function POST(req: Request) {
     const user = await getCurrentUser();
     if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

     // 권한 검증
     if (!hasPermission(user, 'ASSET_CREATE')) {
       return Response.json({ error: 'Forbidden' }, { status: 403 });
     }

     // ...
   }
   ```

4. **감사 로그 기록**
   - 모든 Asset CRUD 작업 기록
   - 실패한 접근 시도도 기록
   - 권한 변경 내역 추적

**완료 조건**:
- [ ] 역할별 권한 매트릭스 정의
- [ ] API별 접근 제어 규칙 작성
- [ ] `tasks/security/guidelines.md` 업데이트
- [ ] Backend 개발자에게 공지

**참고**:
- 기존 License API 접근 제어 정책 참고
- `lib/auth.ts`: getCurrentUser() 함수 사용

---

### **SEC-102: Asset API 입력 검증 규칙** 🟡 중간

**목표**: Asset API의 모든 입력값 유효성 검증 규칙 정의

**파일**: `tasks/security/guidelines.md` (업데이트)

**구현 내용**:

1. **입력 필드별 검증 규칙**
   ```
   필드            | 타입   | 필수 | 검증 규칙
   ───────────────────────────────────────────────
   name            | string | ✅  | 1-255자, 특수문자 금지
   type            | enum   | ✅  | SOFTWARE|CLOUD|HARDWARE|DOMAIN_SSL|OTHER
   description     | string | ❌  | max 5000자
   cost            | number | ✅  | 0-999,999.99
   currency        | string | ✅  | ISO 4217 코드 (USD, KRW 등)
   costFrequency   | enum   | ✅  | MONTHLY|YEARLY|ONE_TIME
   expiryDate      | date   | ❌  | 현재일 이후, 10년 이내
   assignedToId    | string | ❌  | Employee ID 유효성 확인
   ```

2. **XSS/SQL Injection 방지**
   - HTML 특수문자 이스케이핑 (description)
   - parameterized queries 사용 (Prisma 기본)
   - Content-Type 검증 (application/json 필수)

3. **비즈니스 로직 검증**
   - 금액 범위 검증 (음수 불가)
   - 날짜 범위 검증 (과거 날짜 불가)
   - 자산 유형별 필수 필드 (예: CLOUD는 공급자 필드 필수?)

4. **에러 메시지**
   ```json
   {
     "error": "Validation Error",
     "details": [
       { "field": "name", "message": "Required field" },
       { "field": "cost", "message": "Must be positive number" }
     ]
   }
   ```

**완료 조건**:
- [ ] 모든 필드 검증 규칙 정의
- [ ] 에러 메시지 포맷 정의
- [ ] `tasks/security/guidelines.md` 업데이트
- [ ] Backend 개발자에게 공지

**참고**:
- 기존 License API 입력 검증 참고
- `lib/validation.ts` 재사용 (필요시 확장)

---

### **SEC-103: Code Review: Backend (BE-020~025)** 🟠 어려움

**목표**: Backend Asset API 코드의 보안 및 품질 검증

**검수 항목**:

1. **보안 검증**
   - [ ] 인증 & 인가 적용 (401, 403)
   - [ ] 입력 검증 완료
   - [ ] SQL Injection 방지 (Prisma 사용 확인)
   - [ ] XSS 방지 (response escaping)
   - [ ] Rate limiting 적용 (선택)
   - [ ] 로깅에 민감 정보 포함 없음 (비밀번호 등)

2. **코드 품질**
   - [ ] 에러 처리 완료 (try-catch)
   - [ ] 타입 안전성 (TypeScript strict mode)
   - [ ] N+1 쿼리 최적화
   - [ ] 코드 중복 제거
   - [ ] 주석/문서화

3. **테스트**
   - [ ] 단위 테스트 (API 엔드포인트)
   - [ ] 통합 테스트 (DB 포함)
   - [ ] 권한 검증 테스트
   - [ ] 입력 검증 테스트

4. **감사 로그**
   - [ ] CRUD 작업 로깅
   - [ ] 권한 검증 실패 로깅
   - [ ] 민감한 작업 (삭제) 로깅

**리뷰 프로세스**:
```bash
# Backend PR 검토
gh pr view [BE-020 PR#]
gh pr review [PR#] --comment --body "
- 보안 검증: ✅
- 코드 품질: ✅
- 테스트: ✅
- 준비 완료: ✅
"
```

**완료 조건**:
- [ ] BE-020 code review 완료 (approval)
- [ ] BE-021 code review 완료
- [ ] BE-022 code review 완료
- [ ] BE-023 code review 완료
- [ ] BE-024 code review 완료
- [ ] BE-025 code review 완료

**참고**:
- `tasks/security/code-review.md`: 상세 체크리스트
- 기존 License API 코드 참고

---

### **SEC-104: Code Review: Frontend (FE-010~012)** 🟠 어려움

**목표**: Frontend Asset UI 코드의 보안 및 품질 검증

**검수 항목**:

1. **보안 검증**
   - [ ] CSRF 공격 방지 (form 토큰)
   - [ ] XSS 방지 (dangerouslySetInnerHTML 미사용)
   - [ ] 민감한 정보 노출 금지 (콘솔 로그, LocalStorage 피하기)
   - [ ] 파일 업로드 검증 (크기, 타입)
   - [ ] API 호출 권한 검증

2. **접근성 & UX**
   - [ ] ARIA labels 적용
   - [ ] 키보드 네비게이션 지원
   - [ ] 색상 대비 충분함 (WCAG AA)
   - [ ] 에러 메시지 명확함

3. **성능**
   - [ ] 불필요한 렌더링 최소화 (React.memo 등)
   - [ ] 이미지 최적화 (lazy loading)
   - [ ] 번들 크기 확인

4. **코드 품질**
   - [ ] TypeScript strict mode
   - [ ] 컴포넌트 분리 적절
   - [ ] 상태 관리 이해하기 쉬움
   - [ ] 주석 & 문서화

**리뷰 프로세스**:
```bash
# Frontend PR 검토
gh pr view [FE-010 PR#]
gh pr review [PR#] --comment --body "
- 보안 검증: ✅
- 접근성: ✅
- 성능: ✅
- 코드 품질: ✅
- 준비 완료: ✅
"
```

**완료 조건**:
- [ ] FE-010 code review 완료 (approval)
- [ ] FE-011 code review 완료
- [ ] FE-012 code review 완료

---

### **SEC-105: ISMS-P 컴플라이언스 감사** 🟠 어려움

**목표**: Phase 2 구현의 ISMS-P 컴플라이언스 준수 확인

**감사 항목** (VISION.md 참고):

1. **기술적 대책**
   - [ ] 접근 제어 (RBAC) 구현됨
   - [ ] 감사 로그 기록 완전함
   - [ ] 암호화 전송 (HTTPS)
   - [ ] 입력 검증 완료

2. **조직 대책**
   - [ ] 정책 문서 작성 (guidelines.md)
   - [ ] 코드 리뷰 프로세스 적용
   - [ ] 변경 관리 (Git 커밋 로그)

3. **물리적 대책**
   - [ ] 배포 환경 보안 (AWS EC2 정책)
   - [ ] DB 백업 및 복구 계획
   - [ ] 인시던트 대응 계획

4. **감사 로그 검증**
   ```sql
   SELECT * FROM "AuditLog"
   WHERE "entityType" = 'ASSET'
   ORDER BY "createdAt" DESC
   LIMIT 100;
   ```

**완료 조건**:
- [ ] 기술적 대책 충족
- [ ] 조직 대책 충족
- [ ] 물리적 대책 충족
- [ ] 감사 로그 완전성 확인
- [ ] 컴플라이언스 보고서 작성

---

## 🔄 Security 작업 흐름

### 1. 정책 수립 (SEC-101, SEC-102)
```bash
# 문서 작성
cat tasks/security/guidelines.md

# 정책 반영 내용:
# - Asset API 접근 제어
# - 입력 검증 규칙
# - 감시 로깅 정책
```

### 2. Code Review (SEC-103, SEC-104)
```bash
# Backend 코드 리뷰
# - 보안 검증
# - 코드 품질
# - 테스트 완성도

# Frontend 코드 리뷰
# - XSS/CSRF 방지
# - 접근성
# - 성능
```

### 3. 컴플라이언스 감사 (SEC-105)
```bash
# ISMS-P 준수 확인
# - 기술적 대책 충족 여부
# - 조직 대책 충족 여부
# - 감사 로그 완전성

# 보고서 작성
cat tasks/security/phase2-compliance-report.md
```

---

## ✅ 완료 기준

### SEC-101 완료 체크리스트
- [ ] 역할별 권한 매트릭스 정의
- [ ] API별 접근 제어 규칙 작성
- [ ] guidelines.md 업데이트
- [ ] Backend 개발자 공지

### SEC-102 완료 체크리스트
- [ ] 필드별 검증 규칙 정의
- [ ] 에러 메시지 포맷 정의
- [ ] guidelines.md 업데이트
- [ ] Backend 개발자 공지

### SEC-103 완료 체크리스트
- [ ] BE-020~025 code review 완료
- [ ] 보안 이슈 발견 및 보고
- [ ] Approval 또는 Request Changes

### SEC-104 완료 체크리스트
- [ ] FE-010~012 code review 완료
- [ ] 보안 이슈 발견 및 보고
- [ ] Approval 또는 Request Changes

### SEC-105 완료 체크리스트
- [ ] 기술적 대책 확인
- [ ] 조직 대책 확인
- [ ] 물리적 대책 확인
- [ ] 컴플라이언스 보고서 작성

---

## 📚 참고 자료

- **VISION.md**: ISO27001/ISMS-P 요구사항
- **guidelines.md**: 보안 정책 및 규칙
- **code-review.md**: 코드 리뷰 체크리스트
- **SECURITY-START.md**: Security 역할 가이드
- **TICKETS.md**: BE-020~025, FE-010~012 명세

---

## 💬 Q&A

**Q: Code Review는 언제부터?**
A: Backend/Frontend 구현이 완료되면 (PR 오픈 시). 리뷰 중 수정 가능.

**Q: 보안 이슈 발견 시?**
A: "Request Changes"로 마크하고 상세 의견 작성. 개발자가 수정 후 재 리뷰.

**Q: ISMS-P 컴플라이언스는?**
A: 기술적/조직적/물리적 대책 모두 포함. 최종 보고서는 경영진 보고용.

---

## 🎯 성공 기준

Phase 2 Security 완료:
1. ✅ Asset API 접근 제어 정책 수립
2. ✅ 입력 검증 규칙 정의
3. ✅ Backend 코드 리뷰 완료 (승인)
4. ✅ Frontend 코드 리뷰 완료 (승인)
5. ✅ ISMS-P 컴플라이언스 확인

---

## 🚀 다음 단계

1. **SEC-101 완료** (1-2일)
2. **SEC-102 완료** (1-2일)
3. **SEC-103 진행 중** (2-3일, Backend 개발과 병렬)
4. **SEC-104 진행 중** (2-3일, Frontend 개발과 병렬)
5. **SEC-105 완료** (1-2일)

**예상 완료 일정**: 2026-03-21 (2주)

---

**시작하기**: `/security` 명령어로 Security 역할로 전환 후, SEC-101부터 시작하세요! 🔒
