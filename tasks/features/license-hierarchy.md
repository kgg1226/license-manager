# 라이선스 계층 구조 (Sub-License) — Phase 3

## 개요
하나의 라이선스 아래에 여러 개의 관련 라이선스를 계층화하여 관리.

**예시:**
```
Open VPN (상위/패키지)
├─ Domain1.com (하위/세부)
└─ Domain2.com (하위/세부)

Figma (상위/패키지)
├─ Full (하위/세부)
├─ Dev (하위/세부)
└─ Figjam (하위/세부)
```

---

## 요구사항

### 기능
- ✅ 라이선스 생성/수정 시 "상위 라이선스" 선택 가능 (선택사항)
- ✅ 라이선스 목록에서 계층 구조 시각화 (들여쓰기, 트리 아이콘)
- ✅ 상위 라이선스 상세 페이지에서 하위 라이선스 일괄 표시
- ✅ CSV 임포트: `parentLicenseName` 컬럼 추가
- ✅ API: GET `/api/licenses` → 계층 구조 반환

### 데이터 모델
**변경 전:**
```prisma
model License {
  id     Int @id @default(autoincrement())
  name   String @unique
  ...
}
```

**변경 후:**
```prisma
model License {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  parentId  Int?
  parent    License?  @relation("LicenseHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children  License[] @relation("LicenseHierarchy")
  ...
}
```

### 검증
- 순환 참조 방지 (A→B→C→A 불가)
- 상위 라이선스 존재 여부 확인
- 삭제 시: 자동으로 하위 라이선스의 `parentId` = null

---

## 배포 단계

### BE-040: 백엔드 - DB 마이그레이션 & API
**담당:** Backend Role
**파일:**
- `prisma/migrations/[timestamp]_add_license_hierarchy`
- `app/api/licenses/route.ts` (GET 수정)
- `app/api/licenses/[id]/route.ts` (PUT 수정)
- `lib/csv-import.ts` (License import 로직 수정)
- `app/settings/import/templates.ts` (license 헤더 추가)
- `app/settings/import/actions.ts` (importLicenses 함수 수정)

**작업 내용:**
1. Prisma 마이그레이션 생성 & `prisma migrate deploy` 실행
2. License API GET: 계층 구조로 정렬 및 반환 (depth, path 등)
3. License API PUT: `parentId` 검증 & 순환 참조 방지
4. CSV import: `parentLicenseName` 필드 파싱 및 검증

**검증:**
- 순환 참조 테스트 (A→B→A 시도 → 에러)
- NULL parent 처리 (하위→상위 제거 시 자동 정리)
- CSV에서 잘못된 parent 지정 시 에러

---

### FE-030: 프론트엔드 - UI 개편
**담당:** Frontend Role
**파일:**
- `app/licenses/page.tsx` (목록 페이지 - 트리 표시)
- `app/licenses/[id]/page.tsx` (상세 페이지 - 하위 표시)
- `app/licenses/[id]/edit/page.tsx` (편집 - parent 드롭다운)
- UI 컴포넌트: 트리 렌더링 유틸

**작업 내용:**
1. 라이선스 목록: 계층 구조 표시
   - 상위 라이선스만 루트 레벨에 표시
   - 하위는 들여쓰기 + 아이콘으로 시각화
   - 예: `└─ Domain1.com` (부모: Open VPN)

2. 편집 폼: "상위 라이선스" 드롭다운
   - 선택 가능한 상위 라이선스 목록
   - "없음" 옵션 (루트 라이선스)
   - 자신을 부모로 선택 불가

3. 상세 페이지: 하위 라이선스 섹션
   - 있으면: "관련 라이선스" 섹션에 표시
   - 없으면: 숨김

---

### BE-041: 백엔드 - 비용 계산 & 대시보드
**담당:** Backend Role
**파일:**
- `lib/cost-calculator.ts` (월별 비용 계산 로직)
- `app/api/dashboard/summary/route.ts` (대시보드 API)

**작업 내용:**
1. 비용 계산: 상위/하위 어떻게 처리할지?
   - **옵션 A:** 상위만 집계 (하위는 보조 정보)
   - **옵션 B:** 상위 + 하위 전부 합산
   - **권장:** 옵션 A (상위 가격 = 전체 패키지 가격, 하위는 분류/추적용)

2. 대시보드 API: 계층 구조 포함 반환

---

## 테스트 체크리스트

### 기능
- [ ] 라이선스 생성: parent 선택 가능
- [ ] 라이선스 수정: parent 변경 가능
- [ ] 순환 참조: A→B→C→A 시도 → 에러 발생
- [ ] 삭제: 부모 삭제 시 하위 parentId=null로 자동 정리
- [ ] 목록 조회: 계층 구조 올바른 순서 (부모 먼저)
- [ ] CSV 임포트: parentLicenseName 올바르게 파싱

### 데이터 무결성
- [ ] 존재하지 않는 parent 지정 시 에러
- [ ] 자신을 parent로 설정 불가
- [ ] parentId 필드 nullable 확인

---

## 커밋 메시지 규칙
```
be: License hierarchy 스키마 & API 구현
fe: License hierarchy UI (트리 표시, parent 드롭다운)
```

---

## 이슈 & 고려사항
1. **대량 데이터:** 계층 트리를 클라이언트에서 렌더링 시 성능 고려
   → 백엔드에서 정렬 후 반환 권장
2. **깊이 제한:** 무한 계층 vs 2단계 제한?
   → 현재 스펙: 2단계 (상위 1개, 하위 N개)로 가정
3. **권한:** 하위 라이선스만 편집 가능? vs 상위에서도 편집?
   → 현재: 관리자는 모두 편집 가능

---

## Phase 로드맵
- **Phase 3-1 (현재):** 라이선스 계층 구조 기본 기능
- **Phase 3-2 (미정):** 월별 보고서 (별도 티켓)
- **Phase 4 (미정):** Google Drive 아카이빙 (별도 티켓)
