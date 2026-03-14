# 🎨 Frontend Role — 시작하기

> **이 파일은 Frontend를 위한 빠른 시작 가이드입니다.**
>
> 🎯 **목표**: FE-001, FE-ORG-001 구현 (4-5일)

---

## ⚡ 지금 바로 해야 할 일 (5분)

### 1️⃣ Master 브랜치 최신화
```bash
cd /c/asset-manager
git checkout master
git pull origin master
```

### 2️⃣ Frontend 티켓 보기
```bash
# 이 파일을 엽니다:
tasks/TICKETS.md
```

**찾아야 할 섹션**: `🎯 FRONTEND 티켓`

### 3️⃣ 할당된 작업 확인

```
🎫 FE-001
└─ mustChangePassword 강제 비밀번호 변경 UI
   예상 시간: 1-2일
   난이도: 🟢 낮음

🎫 FE-ORG-001
└─ /org 페이지 — Company CRUD UI
   예상 시간: 3-4일
   난이도: 🟡 중간
```

---

## 📚 읽어야 할 문서 (우선순위 순)

### 1️⃣ **`tasks/TICKETS.md`** ← 지금 바로 읽기
- 페이지 오픈
- "🎯 FRONTEND 티켓" 섹션 찾기
- FE-001, FE-ORG-001의 "요구사항" 섹션 읽기
- 모달 디자인 ASCII 아트 확인
- **완료 조건** 체크리스트 확인

### 2️⃣ **`tasks/features/org-and-dashboard-improvements.md`**
- UI/네비게이션 아키텍처
- 조직도 레이아웃
- 모달 디자인 상세 설명
- 화면 구성도

### 3️⃣ **`tasks/VISION.md`** ← 프로젝트 비전 이해
- 최종 목표
- 네비게이션 구조
- 대시보드 설계

---

## 🚀 구현 순서

### Phase 1: FE-001 (1-2일)
```
목표: 강제 비밀번호 변경 UI

구현 순서:
1. /auth/change-password 라우트 생성
2. 강제 리다이렉트 로직 (app/layout.tsx)
3. 비밀번호 변경 폼 컴포넌트
4. API 호출 (PUT /api/admin/users/[id])
5. 테스트
```

**참고**: TICKETS.md의 FE-001 "요구사항" 섹션

### Phase 2: FE-ORG-001 (3-4일)
```
목표: /org 페이지 Company CRUD UI

구현 순서:
1. 생성 모달 (CompanyCreateModal)
2. 수정 모달 (CompanyEditModal)
3. 삭제 모달 (CompanyDeleteModal)
4. org-tree.tsx에 버튼 추가
5. API 호출 연결
6. 토스트 알림
7. 테스트

참고: Backend 작업 대기 (BE-ORG-001, BE-ORG-002)
```

**참고**: TICKETS.md의 FE-ORG-001 "요구사항" 섹션

---

## 📝 기술 참고사항

### 라이브러리
```typescript
// 알림
import { toast } from "sonner";

// 모달 상태
import { useState } from "react";

// 기존 API 호출 패턴 참고
app/org/org-tree.tsx (기존 OrgUnit 수정/삭제)
```

### API 호출
```typescript
// FE-001: 비밀번호 변경
const res = await fetch(`/api/admin/users/${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ currentPassword, newPassword })
});

// FE-ORG-001: Company 생성/수정/삭제
POST|PUT|DELETE /api/org/companies/[id]
```

### 모달 패턴
```typescript
// 상태 관리
const [isOpen, setIsOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);

// API 호출
const handleSubmit = async () => {
  setIsLoading(true);
  try {
    const res = await fetch(...);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error);
      return;
    }
    toast.success("성공 메시지");
    setIsOpen(false);
    await onRefresh(); // 리스트 새로고침
  } catch (error) {
    toast.error("오류 메시지");
  } finally {
    setIsLoading(false);
  }
};
```

---

## ✅ 완료 체크리스트

### FE-001
- [ ] /auth/change-password 라우트 생성
- [ ] 강제 리다이렉트 로직
- [ ] 비밀번호 폼 UI
- [ ] API 호출 연결
- [ ] 에러 처리
- [ ] 테스트

### FE-ORG-001
- [ ] 생성 모달 구현
- [ ] 수정 모달 구현
- [ ] 삭제 모달 구현
- [ ] API 연결
- [ ] 토스트 알림
- [ ] 로딩 상태
- [ ] 모바일 반응형 테스트

### 커밋
- [ ] `[FE-001] Implement password change UI` 커밋
- [ ] `[FE-ORG-001] Add Company CRUD modals to org page` 커밋

---

## 🔗 관련 파일

| 파일 | 설명 |
|------|------|
| `app/org/org-tree.tsx` | OrgUnit 수정/삭제 UI (패턴 참고) |
| `app/org/page.tsx` | 조직도 페이지 |
| `app/login/page.tsx` | 로그인 페이지 (참고용) |

---

## 📌 중요: Backend와의 협력

**FE-001**: Backend 작업 불필요 (바로 시작 가능)

**FE-ORG-001**: Backend 완료 필요
```
순서:
1. Backend: BE-ORG-001, BE-ORG-002 구현
2. Frontend: API 호출 후 구현
```

---

## ❓ 질문이 있으면?

**TICKETS.md에서 세부사항 확인**:
- "요구사항" 섹션: 구현해야 할 것
- "완료 조건" 섹션: 검증 기준
- 모달 ASCII 아트: 정확한 UI 레이아웃

**features 문서 확인**:
- org-and-dashboard-improvements.md - UI 상세

**막히면 Planning Role에 보고**:
- TICKETS.md 업데이트 요청
- 스펙 명확화 요청

---

## 🎯 Success Criteria

**4-5일 내 다음이 완료되어야 합니다**:

✅ FE-001: 강제 비밀번호 변경 UI 완성
✅ FE-ORG-001: Company CRUD 모달 3개 완성
✅ Backend API와 정상 연동
✅ 모든 에러 처리 및 토스트 알림 작동
✅ 모바일 반응형 검증

---

**이제 `tasks/TICKETS.md`를 열어서 FE-001을 시작하세요!** 🚀

Backend가 먼저 BE-ORG-001/002를 완료할 때까지 FE-001부터 시작하면 됩니다.
