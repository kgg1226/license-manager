# 🎨 Frontend 다음 작업 지시서

> **Planning Role이 작성** — Frontend Role은 이 파일을 작업 시작 전 반드시 읽으세요.
> 최종 업데이트: 2026-03-10

---

## 📋 우선순위 순서

| 순서 | 티켓 | 예상 소요 | 상태 |
|---|---|---|---|
| 1 | **FE-040** — 라이선스 계층 구조 UI | 3-4일 | 🔴 즉시 시작 |
| 2 | **FE-020** — 보고서 목록 페이지 | 2-3일 | 🟡 FE-040 후 |
| 3 | **FE-021** — 보고서 상세 페이지 | 1-2일 | 🟡 FE-020 후 |
| 4 | **FE-022** — 예약 보고서 설정 | 1일 | 🟡 FE-021 후 |

> ⚠️ **전제 조건 모두 충족됨**: BE-040 (계층 API) + BE-030~034 (보고서 API) 완료

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
