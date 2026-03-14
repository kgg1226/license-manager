# 🎨 Frontend 역할 (gracious-williamson)

> **branch**: `claude/gracious-williamson`
> **Phase**: Phase 2 — Asset Management Abstraction
> **기간**: 2026-03-07 ~ 2026-03-28 (3주)

---

## 📋 할당 작업 (FE-010~012)

### 🟡 Medium (모두 같은 난이도)

- **FE-010**: Asset 목록 페이지
  - 예상 기간: 2-3일
  - 파일: `app/assets/page.tsx`
  - 기능: 필터, 정렬, 페이지네이션
  - 상태: 🔴 오픈 (BE-020/021 완료 대기)

- **FE-011**: Asset 등록/수정 폼
  - 예상 기간: 2-3일
  - 파일: `app/assets/new/page.tsx`, `app/assets/[id]/edit/page.tsx`
  - 기능: 폼 검증, 담당자 검색
  - 상태: 🔴 오픈 (BE-020/021/022 완료 대기)

- **FE-012**: Asset 상세 페이지
  - 예상 기간: 1-2일
  - 파일: `app/assets/[id]/page.tsx`
  - 기능: 상태 변경, 삭제, 감사 로그
  - 상태: 🔴 오픈 (BE-020/022/023 완료 대기)

---

## 🎯 다음 할 일

### 📌 현재 상태
```
⏳ Backend BE-020 완료 대기 중...
```

### 준비 단계 (지금 가능)
```bash
# 1. Frontend 가이드 읽기
cat tasks/roles/FRONTEND-PHASE2-START.md

# 2. DB 스키마 이해
cat tasks/phase2-db-design.md

# 3. API 스펙 확인
cat tasks/api-spec.md

# 4. UI 디자인 검토
# - Asset 목록 페이지 레이아웃
# - 등록 폼 구조
# - 상세 페이지 정보
```

### BE-020 완료 후 (2-3일 뒤)
1. FE-010: Asset 목록 페이지 구현 시작
2. FE-011: 등록/수정 폼 구현
3. FE-012: 상세 페이지 구현

---

## 📚 참고 문서

| 문서 | 설명 |
|------|------|
| **tasks/roles/FRONTEND-PHASE2-START.md** | 📍 시작 가이드 (5분) |
| **tasks/phase2-db-design.md** | API 응답 구조 |
| **tasks/TICKETS.md** | 전체 티켓 목록 |
| **tasks/api-spec.md** | API 엔드포인트 |

---

## ✅ UI 컴포넌트 체크리스트

### FE-010 완료 시
- [ ] 목록 페이지 레이아웃
- [ ] 필터 & 정렬 기능
- [ ] 페이지네이션
- [ ] 상태 배지 표시
- [ ] 모바일 반응형

### FE-011 완료 시
- [ ] 등록 폼 완성
- [ ] 수정 폼 완성
- [ ] Client-side 검증
- [ ] 담당자 검색
- [ ] 에러 메시지

### FE-012 완료 시
- [ ] 상세 정보 표시
- [ ] 상태 변경 팝업
- [ ] 삭제 기능
- [ ] 감사 로그 표시
- [ ] 할당 정보 표시

---

## 🛠️ 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **State**: React Hooks (useState, useEffect)
- **Form**: React Hook Form (권장)
- **Data Fetch**: fetch API

---

## 💡 팁

- 🔴 Backend BE-020 완료를 기다리세요. (조건 블로커)
- 📐 UI 디자인은 기존 License 페이지를 참고하세요.
- 🧪 Mock data로 먼저 UI를 구현한 후 API 연결하세요.
- 🎨 컴포넌트는 `components/` 폴더의 기존 컴포넌트를 재사용하세요.

---

**준비 문서**: `cat tasks/roles/FRONTEND-PHASE2-START.md` 👇
