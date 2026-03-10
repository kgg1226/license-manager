# 🔵 Backend Role — 시작하기

> **이 파일은 Backend를 위한 빠른 시작 가이드입니다.**
>
> 🎯 **목표**: BE-ORG-001, BE-ORG-002 구현 (1-2일)

---

## ⚡ 지금 바로 해야 할 일 (5분)

### 1️⃣ Master 브랜치 최신화
```bash
cd /c/license-manager
git checkout master
git pull origin master
```

### 2️⃣ Backend 티켓 보기
```bash
# 이 파일을 엽니다:
tasks/TICKETS.md
```

**찾아야 할 섹션**: `⚙️ BACKEND 티켓`

### 3️⃣ 할당된 작업 확인

```
🎫 BE-ORG-001
└─ PUT /api/org/companies/[id] — 회사 이름 수정
   예상 시간: 1일
   난이도: 🟢 낮음

🎫 BE-ORG-002
└─ DELETE /api/org/companies/[id] — 회사 삭제
   예상 시간: 1일
   난이도: 🟢 낮음
```

---

## 📚 읽어야 할 문서 (우선순위 순)

### 1️⃣ **`tasks/TICKETS.md`** ← 지금 바로 읽기
- 페이지 오픈
- "⚙️ BACKEND 티켓" 섹션 찾기
- BE-ORG-001, BE-ORG-002의 "요구사항" 섹션 읽기
- **완료 조건** 체크리스트 확인

### 2️⃣ **`tasks/features/org-and-dashboard-improvements.md`**
- Company CRUD 스펙
- DB 모델 설명
- API 요청/응답 형식
- Prisma 코드 예제

### 3️⃣ **`tasks/VISION.md`** ← 프로젝트 비전 이해
- 최종 목표 알기
- Phase별 로드맵 이해

### 4️⃣ **`tasks/api-spec.md`**
- API 명세 확인
- 기존 API 패턴 학습

---

## 🚀 구현 순서

### Step 1: API 라우트 생성
```
파일: app/api/org/companies/[id]/route.ts

메서드:
- PUT: 회사 수정
- DELETE: 회사 삭제
```

### Step 2: 요구사항 구현
```
TICKETS.md의 "요구사항" 섹션을 하나씩 체크하면서 구현:

BE-ORG-001:
✅ 라우트 생성
✅ 유효성 검증 (name 길이, 필수여부)
✅ 중복 검증 (409 Conflict)
✅ AuditLog 기록
✅ 응답 형식

BE-ORG-002:
✅ 라우트 생성
✅ OrgUnit 확인 (있으면 409)
✅ 삭제 실행
✅ AuditLog 기록
```

### Step 3: 테스트
```
TICKETS.md의 "완료 조건" 섹션 체크:
✅ 정상 케이스 (200 OK)
✅ 중복 케이스 (409 Conflict)
✅ 유효성 실패 (400 Bad Request)
✅ AuditLog 정상 기록
```

---

## 📝 기술 참고사항

### 라이브러리
```typescript
// validation
import { vStrReq, handleValidationError, handlePrismaError } from "@/lib/validation";

// audit log
import { writeAuditLog } from "@/lib/audit-log";

// prisma
import { prisma } from "@/lib/prisma";
```

### 에러 처리 패턴
```typescript
// 유효성 검증 실패
const vErr = handleValidationError(error);
if (vErr) return vErr;

// Prisma 에러 (중복, FK 등)
const pErr = handlePrismaError(error, {
  uniqueMessage: "이미 존재하는 회사명입니다."
});
if (pErr) return pErr;
```

### AuditLog 기록
```typescript
await writeAuditLog(tx, {
  entityType: "ORG_COMPANY",
  action: "UPDATED", // 또는 DELETED
  actor: user.username,
  actorType: "USER",
  actorId: user.id,
  details: { name: "회사명" }
});
```

---

## ✅ 완료 체크리스트

### 구현
- [ ] BE-ORG-001 구현 완료
- [ ] BE-ORG-002 구현 완료
- [ ] 유효성 검증 추가
- [ ] 에러 처리 추가
- [ ] AuditLog 기록 추가

### 테스트
- [ ] 정상 케이스 테스트
- [ ] 에러 케이스 테스트 (409, 400)
- [ ] AuditLog 기록 확인
- [ ] API 응답 형식 확인

### 커밋
- [ ] `[BE-ORG-001] Implement PUT /api/org/companies/[id]` 커밋
- [ ] `[BE-ORG-002] Implement DELETE /api/org/companies/[id]` 커밋

---

## 🔗 관련 파일

| 파일 | 설명 |
|------|------|
| `app/api/org/companies/route.ts` | POST 구현 (참고용) |
| `app/api/org/units/[id]/route.ts` | 패턴 참고 (PUT/DELETE) |
| `app/api/licenses/[id]/route.ts` | 에러 처리 패턴 참고 |
| `lib/validation.ts` | 검증 유틸 함수 |
| `lib/audit-log.ts` | AuditLog 기록 함수 |
| `prisma/schema.prisma` | DB 스키마 |

---

## ❓ 질문이 있으면?

**TICKETS.md에서 세부사항 확인**:
- "요구사항" 섹션: 구현해야 할 것
- "완료 조건" 섹션: 검증 기준
- "기술 사항" 섹션: 코드 위치, 라이브러리

**막히면 Planning Role에 보고**:
- TICKETS.md 업데이트 요청
- 스펙 명확화 요청

---

## 🎯 Success Criteria

**2일 내 다음이 완료되어야 합니다**:

✅ BE-ORG-001: `PUT /api/org/companies/[id]` 구현 & 테스트
✅ BE-ORG-002: `DELETE /api/org/companies/[id]` 구현 & 테스트
✅ Frontend가 API 호출 가능 상태
✅ 모든 에러 처리 및 로그 정상 작동

---

**이제 `tasks/TICKETS.md`를 열어서 BE-ORG-001을 시작하세요!** 🚀

질문이나 명확하지 않은 부분이 있으면 Planning Role에 연락하세요.
