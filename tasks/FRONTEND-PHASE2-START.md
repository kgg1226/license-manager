# 🎨 Frontend Phase 2 빠른 시작 가이드

> **역할**: Frontend (/frontend)
> **Phase**: Phase 2 — Asset Management Abstraction
> **기간**: 2026-03-07 ~ 2026-03-28 (3주)
> **목표**: Asset 관리 UI 구현 (목록, 등록, 상세 페이지)

---

## ⚡ 5분 안에 시작하기

### 1. 문서 확인 (필독)
```bash
# 작업 명세
cat tasks/TICKETS.md          # FE-010~012 티켓 상세 요구사항

# 데이터베이스 설계
cat tasks/phase2-db-design.md # Asset 모델 및 API 구조

# API 스펙
cat tasks/api-spec.md         # GET|POST|PUT|DELETE 엔드포인트

# 기본 가이드
cat FRONTEND-START.md         # Frontend 개발 규칙 (이미 읽었다면 스킵)
```

### 2. Branch 전환
```bash
# Planning 역할 worktree에서 Frontend 역할로 전환
/frontend

# 또는 수동 worktree 전환
cd /c/license-manager/.claude/worktrees/[role]/
```

### 3. 현재 상태 확인
```bash
npm run dev          # Dev server 시작 (포트 3000)
# http://localhost:3000/assets 아직 구현 안 됨
```

---

## 🎯 Phase 2 Frontend 티켓 (3개)

| 순번 | 티켓 | 제목 | 난이도 | 예상 기간 | 상태 | 의존성 |
|------|------|------|--------|---------|------|--------|
| 1 | **FE-010** | Asset 목록 페이지 | 🟡 중간 | 2-3일 | 🔴 오픈 | BE-020, BE-021 |
| 2 | **FE-011** | Asset 등록/수정 폼 | 🟡 중간 | 2-3일 | 🔴 오픈 | BE-020, BE-021/022 |
| 3 | **FE-012** | Asset 상세 페이지 | 🟡 중간 | 1-2일 | 🔴 오픈 | BE-020, BE-022/023 |

**💡 추천 순서**: FE-010 → FE-011 → FE-012

**⚠️ 주의**: Backend BE-020 (Schema 추가) 완료 후 시작 권장

---

## 📋 Ticket 상세 요약

### **FE-010: Asset 목록 페이지** 🟡 중간

**목표**: Asset 전체 목록 조회 및 관리 페이지

**경로**: `app/assets/page.tsx`

**구현 내용**:

1. **헤더 섹션**
   - 페이지 제목: "자산 관리"
   - "새 자산 등록" 버튼 (FE-011로 이동)
   - 검색창

2. **필터 & 정렬**
   - 유형 필터: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
   - 상태 필터: ACTIVE, INACTIVE, DISPOSED
   - 정렬: 이름, 비용, 만료일, 생성일

3. **테이블**
   - 컬럼: 자산명, 유형, 상태, 비용, 만료일, 담당자, 작업
   - 페이지네이션 (20개씩)
   - 행 클릭 → 상세 페이지 (FE-012)

4. **기능**
   - 검색어 입력 (debounce)
   - 필터 선택
   - 정렬 변경
   - 일괄 선택 (체크박스)
   - 행 액션: 수정, 삭제, 상태 변경

5. **상태 표시**
   - ACTIVE: 초록색 배지
   - INACTIVE: 회색 배지
   - DISPOSED: 빨간색 배지

**API 호출**:
```bash
GET /api/assets?type=SOFTWARE&status=ACTIVE&search=Excel&skip=0&take=20&sortBy=name&sortOrder=asc
```

**응답 형식** (BE-021 참고):
```json
{
  "total": 150,
  "data": [
    {
      "id": "...",
      "name": "Microsoft Excel",
      "type": "SOFTWARE",
      "status": "ACTIVE",
      "cost": 120.00,
      "expiryDate": "2027-03-07",
      "assignedTo": { "id": "...", "name": "이순신" }
    }
  ]
}
```

**완료 조건**:
- [ ] 페이지 레이아웃 완성 (헤더, 검색, 필터, 테이블)
- [ ] 필터 정상 작동
- [ ] 정렬 정상 작동
- [ ] 페이지네이션 정상 작동
- [ ] 상태 표시 UI
- [ ] 로딩 상태 표시
- [ ] 에러 처리
- [ ] 반응형 디자인 (모바일)

**UI 컴포넌트** (기존 재사용):
- `components/common/SearchBar.tsx`
- `components/common/Table.tsx` (또는 새로 생성)
- `components/common/Pagination.tsx`
- `components/common/Badge.tsx` (상태 표시)

---

### **FE-011: Asset 등록/수정 폼** 🟡 중간

**목표**: Asset 신규 등록 및 기존 자산 수정

**경로**:
- 신규: `app/assets/new/page.tsx`
- 수정: `app/assets/[id]/edit/page.tsx`

**구현 내용**:

1. **폼 필드**
   - 자산명 (필수, text)
   - 유형 (필수, select: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER)
   - 설명 (선택, textarea)
   - 비용 (필수, number)
   - 통화 (select: USD, KRW, EUR 등)
   - 비용 주기 (select: MONTHLY, YEARLY, ONE_TIME)
   - 만료일 (선택, date)
   - 담당자 (선택, search select → Employee 조회)

2. **폼 상태 및 검증**
   - Client-side: 필수 필드 검증
   - Server-side: (API에서 처리)
   - 에러 메시지 표시
   - 제출 중 버튼 disabled

3. **액션**
   - "저장" 버튼 → POST /api/assets (신규) or PUT /api/assets/[id] (수정)
   - "취소" 버튼 → 목록 페이지로 이동
   - 저장 성공 → 상세 페이지로 리다이렉트

4. **담당자 선택**
   - Search input → API 호출로 Employee 검색
   - 결과 드롭다운 표시
   - 선택 후 표시

**API 호출**:
```bash
# 신규 등록
POST /api/assets
Body: {
  "name": "AWS EC2",
  "type": "CLOUD",
  "cost": 500,
  "currency": "USD",
  "expiryDate": "2027-03-07",
  "assignedToId": "emp-123"
}

# 수정
PUT /api/assets/[id]
Body: { ... }
```

**완료 조건**:
- [ ] 폼 레이아웃 완성
- [ ] 모든 필드 입력 가능
- [ ] Client-side 검증
- [ ] 담당자 검색 및 선택
- [ ] 저장 기능 정상 작동
- [ ] 에러 처리 (400, 500)
- [ ] 로딩 상태 표시

**UI 컴포넌트**:
- `components/common/TextInput.tsx`
- `components/common/Select.tsx`
- `components/common/DatePicker.tsx`
- `components/common/SearchSelect.tsx` (담당자 검색)
- `components/common/Button.tsx`

---

### **FE-012: Asset 상세 페이지** 🟡 중간

**목표**: Asset 상세 정보 조회 및 관리

**경로**: `app/assets/[id]/page.tsx`

**구현 내용**:

1. **상세 정보 섹션**
   - 자산명, 유형, 상태 (배지)
   - 설명
   - 비용, 통화, 비용 주기
   - 만료일 (만료 임박 시 경고 배지)
   - 담당자 (클릭 → 담당자 상세로 이동)
   - 생성일, 수정일

2. **액션 버튼**
   - "수정" → FE-011 (수정 폼)
   - "상태 변경" → 상태 선택 팝업 (ACTIVE, INACTIVE, DISPOSED)
   - "삭제" → 확인 대화상자 → 삭제

3. **할당 정보 섹션** (Assignment 관련)
   - 현재 할당된 직원 표시
   - 할당 시작/종료일
   - 할당 목록 테이블

4. **감사 로그 섹션**
   - 최근 변경 이력
   - 변경자, 변경일시, 변경 내용

5. **상태 변경 팝업**
   - 현재 상태 표시
   - 변경할 상태 선택 (radio)
   - 변경 사유 입력 (선택)
   - "변경" / "취소" 버튼

**API 호출**:
```bash
# 상세 조회
GET /api/assets/[id]

# 상태 변경
PATCH /api/assets/[id]/status
Body: {
  "status": "INACTIVE",
  "reason": "일시 중지"
}

# 삭제
DELETE /api/assets/[id]
```

**응답 형식**:
```json
{
  "id": "...",
  "name": "Microsoft 365",
  "type": "SOFTWARE",
  "status": "ACTIVE",
  "cost": 1200.00,
  "currency": "USD",
  "expiryDate": "2026-12-31",
  "assignedTo": { "id": "...", "name": "이순신" },
  "createdAt": "2026-01-15",
  "updatedAt": "2026-03-07"
}
```

**완료 조건**:
- [ ] 상세 정보 표시
- [ ] 상태 변경 기능 정상 작동
- [ ] 삭제 기능 정상 작동
- [ ] 감사 로그 표시
- [ ] 할당 정보 표시
- [ ] 에러 처리 (404, 500)
- [ ] 로딩 상태 표시

**UI 컴포넌트**:
- `components/common/Badge.tsx` (상태)
- `components/common/Modal.tsx` (상태 변경, 삭제 확인)
- `components/common/Table.tsx` (할당, 감사 로그)
- `components/common/Button.tsx`

---

## 🔄 개발 흐름

### 1. Backend API 확인 (필수)
```bash
# BE-020 완료 확인
npm run dev
curl http://localhost:3000/api/assets  # 200 OK 응답 확인
```

### 2. FE-010: 목록 페이지 구현
```bash
# 페이지 생성
touch app/assets/page.tsx

# 구현 순서:
# 1. 기본 레이아웃 (헤더, 검색, 필터, 테이블)
# 2. API 호출 (fetch, useSWR)
# 3. 필터 & 정렬 기능
# 4. 페이지네이션
# 5. 로딩 & 에러 상태
# 6. 반응형 디자인
```

### 3. FE-011: 등록/수정 폼
```bash
# 페이지 생성
touch app/assets/new/page.tsx
touch app/assets/[id]/edit/page.tsx

# 구현 순서:
# 1. 폼 필드 구성 (TextInput, Select 등)
# 2. Client-side 검증
# 3. 담당자 검색 기능
# 4. 제출 로직 (POST / PUT)
# 5. 성공/에러 처리
```

### 4. FE-012: 상세 페이지
```bash
# 페이지 생성
touch app/assets/[id]/page.tsx

# 구현 순서:
# 1. 상세 정보 표시
# 2. 상태 변경 팝업
# 3. 삭제 기능
# 4. 감사 로그 표시
# 5. 할당 정보 표시
```

---

## ✅ 완료 기준

### FE-010 완료 체크리스트
- [ ] 목록 페이지 조회 정상
- [ ] 필터 정상 작동
- [ ] 정렬 정상 작동
- [ ] 페이지네이션 정상
- [ ] 상태 배지 표시
- [ ] 모바일 반응형

### FE-011 완료 체크리스트
- [ ] 등록 폼 완성
- [ ] 수정 폼 완성
- [ ] 검증 정상
- [ ] 제출 정상
- [ ] 담당자 검색 정상
- [ ] 에러 처리

### FE-012 완료 체크리스트
- [ ] 상세 정보 표시
- [ ] 상태 변경 정상
- [ ] 삭제 정상
- [ ] 감사 로그 표시
- [ ] 할당 정보 표시
- [ ] 로딩 상태

---

## 📚 참고 자료

- **TICKETS.md**: FE-010~012 상세 명세
- **phase2-db-design.md**: Asset 모델 및 API 구조
- **api-spec.md**: API 엔드포인트 정의
- **FRONTEND-START.md**: Frontend 개발 규칙
- **CLAUDE.md**: 프로젝트 구조

---

## 🎬 사용 기술

- **Framework**: Next.js 16 (App Router)
- **State Management**: React Hooks (useState, useEffect)
- **Data Fetching**: fetch API (또는 SWR/React Query)
- **Styling**: Tailwind CSS 4
- **Form**: React Hook Form (권장)
- **UI Components**: 기존 components/ 재사용

---

## 💬 Q&A

**Q: Backend API가 아직 없으면?**
A: Mock data로 UI 먼저 구현. `const mockAssets = [...]` 사용 후 API 연결.

**Q: 담당자 검색은 어떻게?**
A: Employee API 활용. `GET /api/employees?search=이순신` 호출.

**Q: 일괄 삭제는?**
A: Phase 3에서 구현. Phase 2는 1개씩 삭제만.

---

## 🚀 다음 단계

1. **Backend BE-020 완료 대기**
2. **FE-010 구현** (2-3일)
3. **FE-011 구현** (2-3일)
4. **FE-012 구현** (1-2일)
5. **통합 테스트 및 QA** (1-2일)

**예상 완료 일정**: 2026-03-21 (2주)

---

**시작하기**: `/frontend` 명령어로 Frontend 역할로 전환 후, Backend BE-020 완료를 기다린 후 FE-010부터 시작하세요! 🚀
