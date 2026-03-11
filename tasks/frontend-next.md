# 🎨 Frontend 다음 작업 지시서

> **Planning Role이 작성** — Frontend Role은 이 파일을 작업 시작 전 반드시 읽으세요.
> 최종 업데이트: 2026-03-11

---

## 📋 우선순위 순서

| 순서 | 티켓 | 예상 소요 | 상태 |
|---|---|---|---|
| **0** | **FE-050** — 공개 열람 모드 (proxy.ts + layout + 버튼) | **1일** | 🔴 **최우선** |
| 1 | **FE-040** — 라이선스 계층 구조 UI | 3-4일 | 🟡 FE-050 후 |
| 2 | **FE-020** — 보고서 목록 페이지 | 2-3일 | 🟡 FE-040 후 |
| 3 | **FE-021** — 보고서 상세 페이지 | 1-2일 | 🟡 FE-020 후 |
| 4 | **FE-022** — 예약 보고서 설정 | 1일 | 🟡 FE-021 후 |

> ⚠️ **FE-050을 먼저 완료할 것** — BE-050과 병렬 진행 가능 (서로 독립적)

> ⚠️ **전제 조건 모두 충족됨**: BE-040 (계층 API) + BE-030~034 (보고서 API) 완료

---

## 🔴 [FE-050] 공개 열람 모드 ← 최우선

> BE-050과 병렬 진행 가능. 독립 작업.

### 변경 파일 3개

#### 1. `proxy.ts` — 핵심 변경

```typescript
// 현재 코드 (변경 전):
const sessionToken = request.cookies.get("session_token")?.value;
if (!sessionToken) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));  // ← 이게 문제
}
return passthrough();

// 변경 후:
const sessionToken = request.cookies.get("session_token")?.value;
// API 변경 요청(POST/PUT/PATCH/DELETE)만 인증 요구
if (!sessionToken && pathname.startsWith("/api/")) {
  const method = request.method;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
}
// 페이지 및 API GET → 항상 통과
return passthrough();
```

#### 2. `app/layout.tsx` — 리다이렉트 제거 + 로그인 버튼 추가

```typescript
// 제거할 코드:
if (!user && pathname !== "/login") {
  redirect("/login");  // ← 이 블록 통째로 삭제
}

// nav 조건부 표시 → 항상 표시로 변경:
// {user && <nav>...</nav>}  →  <nav>...</nav>

// 우측 영역 변경:
// 기존: user.username + 로그아웃
// 변경: 로그인 상태면 username + 로그아웃, 미인증이면 "로그인" 링크
{user ? (
  <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
    <span className="text-xs text-gray-400">{user.username}</span>
    <LogoutButton />
  </div>
) : (
  <div className="border-l border-gray-200 pl-4">
    <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
      로그인
    </Link>
  </div>
)}
```

> `user.mustChangePassword` 강제 변경 로직은 유지 (로그인된 사용자 대상이므로 그대로)

#### 3. 페이지 컴포넌트 — 쓰기 버튼 숨기기

**원칙**: `user` 가 있을 때만 등록/수정/삭제 버튼 렌더링

```tsx
// 서버 컴포넌트에서 user 받아오기 (getCurrentUser는 이미 layout에서 호출됨)
// 또는 각 페이지에서 직접 호출:
const user = await getCurrentUser().catch(() => null);

// 등록 버튼
{user && <Link href="/licenses/new"><button>+ 등록</button></Link>}

// 수정/삭제 버튼
{user && <Link href={`/licenses/${id}/edit`}>수정</Link>}
{user && <DeleteButton id={id} />}
```

**쓰기 전용 페이지** (`/new`, `/edit`)는 여전히 로그인 필수:
```typescript
// app/licenses/new/page.tsx, app/licenses/[id]/edit/page.tsx 상단
const user = await getCurrentUser();
if (!user) redirect("/login");
```

**변경이 필요한 파일**:
- `app/layout.tsx` — 리다이렉트 제거 + nav 항상 표시 + 로그인 버튼
- `proxy.ts` — 페이지 리다이렉트 제거
- `app/licenses/page.tsx` — "등록" 버튼 `{user && ...}` 조건 추가
- `app/licenses/[id]/page.tsx` — "수정", "삭제" 버튼 조건 추가
- `app/employees/page.tsx` — "등록" 버튼 조건 추가
- `app/employees/[id]/page.tsx` — "수정", "삭제" 버튼 조건 추가
- `app/assets/page.tsx` — "등록" 버튼 조건 추가
- `app/assets/[id]/page.tsx` — "수정", "삭제" 버튼 조건 추가
- `app/org/page.tsx` — 편집 UI 조건 추가
- `app/settings/groups/page.tsx` — 생성/삭제 버튼 조건 추가
- `app/settings/import/page.tsx` — 로그인 필수 유지 (쓰기 전용)
- `app/admin/users/page.tsx` — ADMIN 필수 유지 (기존과 동일)

### 완료 조건

- [ ] 비로그인으로 `/licenses`, `/employees`, `/dashboard`, `/org`, `/history` 열람 가능
- [ ] nav가 비로그인에도 표시되며, 우측에 "로그인" 링크 노출
- [ ] 비로그인 상태에서 등록/수정/삭제 버튼 미노출
- [ ] `/licenses/new`, `/licenses/[id]/edit` 직접 URL 접근 시 `/login` 이동
- [ ] 로그인 후 모든 기능 정상 작동
- [ ] `/admin/users` ADMIN 전용 유지

---

## 🔴 [FE-040] 라이선스 계층 구조 UI

> 상세 스펙: `tasks/TICKETS.md` → FE-040 섹션
> BE-040 완료됨 — API 연동 준비됨

### 수정할 파일

#### 1. `app/licenses/page.tsx` — 목록 페이지 계층 트리

**현재**: 단순 테이블 목록
**목표**: 부모-자식 계층 시각화

```
Open VPN                    ← 상위 라이선스 (들여쓰기 없음)
  └─ Domain1.com            ← 하위 라이선스 (pl-4 들여쓰기 + └─ 아이콘)
  └─ Domain2.com
Figma
  └─ Full
  └─ Dev
  └─ Figjam
```

**구현 방법**:
- `GET /api/licenses` 응답에 `parentId`, `children` 포함됨
- 루트(parentId = null)만 먼저 렌더링
- 각 루트 하위에 children을 들여쓰기하여 렌더링
- Tailwind: `pl-4` (16px), `text-gray-400` (└─ 아이콘)

**렌더링 로직 예시 (의사코드)**:
```
const roots = licenses.filter(l => !l.parentId)
roots.forEach(root => {
  renderRow(root, indent=0)
  root.children.forEach(child => renderRow(child, indent=1))
})
```

---

#### 2. `app/licenses/[id]/edit/page.tsx` — 편집 페이지 상위 드롭다운

**추가할 필드**: "상위 라이선스" 선택 드롭다운

```html
<label>상위 라이선스</label>
<select name="parentId">
  <option value="">없음 (최상위)</option>
  <!-- 자신 제외한 모든 라이선스 -->
  <option value="1">Open VPN</option>
  <option value="2">Figma</option>
</select>
```

**조건**:
- 자기 자신은 선택 불가 (disabled)
- 이미 하위 라이선스가 있는 경우 자신이 하위가 되면 안 됨 (순환 방지)
- API: `PUT /api/licenses/[id]` 에 `parentId` 필드 포함하여 전송

---

#### 3. `app/licenses/[id]/page.tsx` — 상세 페이지 하위 라이선스 섹션

**추가할 섹션** (children 있을 때만 표시):
```
## 관련 라이선스 (하위)
| 이름       | 유형      | 상태  |
|-----------|---------|-----|
| Domain1   | KEY_BASED | 활성 |
| Domain2   | KEY_BASED | 활성 |
```

**조건**: `children.length === 0` 이면 섹션 숨김

---

#### 4. CSV 템플릿 — `parentLicenseName` 컬럼 추가

파일 위치: CSV 다운로드 버튼이 있는 컴포넌트 (import 페이지 또는 licenses 페이지)
- 기존 CSV 헤더에 `parentLicenseName` 컬럼 추가
- 샘플 행: `Open VPN,,,,,,,,,,` (상위), `Domain1.com,,,,,,,,,Open VPN` (하위)

---

### API 연동 정보

```typescript
// 계층 포함 목록 조회
GET /api/licenses?includeChildren=true
// 응답 예시:
{
  licenses: [
    { id: 1, name: "Open VPN", parentId: null, children: [
      { id: 3, name: "Domain1.com", parentId: 1 },
      { id: 4, name: "Domain2.com", parentId: 1 }
    ]},
    { id: 2, name: "Figma", parentId: null, children: [...] }
  ]
}

// 라이선스 수정 (parentId 포함)
PUT /api/licenses/[id]
Body: { name: "...", parentId: 1 }  // parentId: null = 최상위
```

---

### 완료 조건 체크리스트

- [ ] 목록: 계층 트리 정상 렌더링 (들여쓰기 + └─ 아이콘)
- [ ] 목록: 상위/하위 라이선스 모두 표시
- [ ] 편집: 상위 라이선스 드롭다운 (자신 제외)
- [ ] 상세: 하위 라이선스 섹션 (있을 때만)
- [ ] CSV 템플릿: parentLicenseName 컬럼
- [ ] Tailwind 스타일 일관성 유지

---

## 🟡 [FE-020] 보고서 목록 페이지

> 상세 스펙: `tasks/PHASE3-TICKETS.md` → FE-020 섹션

**경로**: `app/reports/page.tsx` (신규 파일)

### 기능 요구사항

1. **월 선택기**
   - `YYYY-MM` 형식 입력 (또는 드롭다운)
   - 기본값: 현재 달
   - 예: `2026-03`

2. **보고서 조회**
   - 선택한 월의 집계 데이터 표시
   - `GET /api/reports/monthly/[yearMonth]/data` 호출

3. **요약 카드** (상단)
   ```
   총 비용: $125,000   자산 수: 35개   월: 2026-03
   ```

4. **유형별 비용 테이블**
   ```
   | 유형      | 자산 수 | 비용       |
   |---------|-------|---------|
   | SOFTWARE | 10    | $60,000  |
   | CLOUD    | 8     | $40,000  |
   | HARDWARE | 5     | $15,000  |
   ...
   ```

5. **다운로드 버튼**
   - Excel: `GET /api/reports/monthly/[yearMonth]/excel` → `<a href>` 다운로드
   - PDF: `GET /api/reports/monthly/[yearMonth]/pdf` → `<a href>` 다운로드

6. **네비게이션**: 사이드바에 "보고서" 메뉴 추가

### 완료 조건
- [ ] 월 선택 후 데이터 조회 정상 작동
- [ ] 요약 카드 표시
- [ ] 유형별 테이블 표시
- [ ] Excel 다운로드 정상
- [ ] PDF 다운로드 정상

---

## 🟡 [FE-021] 보고서 상세 페이지

> 상세 스펙: `tasks/PHASE3-TICKETS.md` → FE-021 섹션

**경로**: `app/reports/[yearMonth]/page.tsx`

- 유형별 비용 분포 차트 (recharts 사용, 이미 프로젝트에 있음)
- 자산 상세 목록 (페이지네이션)

---

## 🟡 [FE-022] 예약 보고서 설정

> 상세 스펙: `tasks/PHASE3-TICKETS.md` → FE-022 섹션

**경로**: `app/reports/settings/page.tsx`

- 월별 자동 이메일 발송 설정
- 수신자 이메일 목록 관리
- `POST /api/reports/monthly/[yearMonth]/email` 수동 발송 트리거

---

## 🔧 개발 환경 확인

```bash
# 최신 master 동기화
git checkout role/frontend
git merge origin/master

# 로컬 개발 서버
npm run dev

# master의 특정 파일 확인
git show origin/master:app/licenses/page.tsx
```

---

## 📚 참고

- API 명세: `tasks/api-spec.md`
- 보안 규칙: `tasks/security/guidelines.md`
- 기존 컴포넌트 패턴: `app/licenses/page.tsx` (테이블), `app/dashboard/page.tsx` (차트)
