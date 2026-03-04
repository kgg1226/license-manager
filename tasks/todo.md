# TODO

> 기획 세션(/planning)에서 관리한다.

---

## 완료된 기능 (구현 확인됨)

### 인증
- [x] 로그인 / 로그아웃 (세션 쿠키 기반)
- [x] 세션 확인 API
- [x] 역할 기반 접근 제어 (ADMIN / USER)

### 라이선스 관리
- [x] 라이선스 목록 조회 (할당 수, 잔여 수량, 키 미등록 카운트 포함)
- [x] 라이선스 등록 (KEY_BASED / VOLUME / NO_KEY 3가지 유형)
- [x] 라이선스 상세 조회
- [x] 라이선스 수정 (유형 변경 시 활성 배정 유무 검증)
- [x] 라이선스 삭제 (관련 배정·시트·이력 함께 삭제)
- [x] 시트(개별 키) 등록·수정, 중복 검사

### 조직원 관리
- [x] 조직원 목록 조회 (활성 배정 수 포함)
- [x] 조직원 등록 (기본 그룹 라이선스 자동 할당)
- [x] 조직원 상세 조회 (보유 라이선스 목록 포함)
- [x] 조직원 기본 정보 수정 (이름, 부서, 이메일)
- [x] 조직원 조직 정보 수정 (회사, 부서, 직급)
- [x] 조직원 삭제

### 할당·반납
- [x] 할당 목록 조회
- [x] 라이선스 할당 (Server Action)
- [x] 라이선스 반납
- [x] 할당 삭제

### 라이선스 그룹
- [x] 그룹 목록 / 상세 조회
- [x] 그룹 생성·수정·삭제
- [x] 그룹 라이선스 멤버 추가·제거
- [x] 기본 그룹 설정 (조직원 등록 시 자동 할당)

### 조직 관리
- [x] 회사(OrgCompany) 목록 조회 (부서 계층 포함)
- [x] 회사 생성
- [x] 조직도 페이지 (계층 구조 시각화)

### 대시보드
- [x] 라이선스 현황 요약 (총 라이선스, 연간 비용, 갱신 예정)
- [x] 월별 비용 추이 차트
- [x] 라이선스 유형 분포 차트
- [x] 누적 성장 추이 차트

### 감사 로그
- [x] 전체 감사 이력 조회 페이지 (/history)
- [x] 엔티티 타입 / 액션 타입 필터

### 데이터 가져오기
- [x] CSV 임포트 (라이선스, 조직원, 그룹, 배정)

### 사용자 관리
- [x] 사용자 목록 / 생성 / 수정 (ADMIN 전용, /admin/users)

---

## 대기

### DB 마이그레이션 (백엔드 선행 필수)
> `tasks/db-changes.md` [2026-03-04] 항목 참조
- [ ] OrgUnit: `sortOrder`, `updatedAt` 추가 + unique 제약 변경
- [ ] Employee: `orgUnitId`, `status`, `offboardingUntil` 추가 + 데이터 마이그레이션 + 구 컬럼(`orgId`, `subOrgId`) 제거
- [ ] Employee: `mustChangePassword` 추가 (User 테이블)
- [ ] License: `renewalDate`, `renewalDateManual`, `renewalStatus` 추가
- [ ] 신규 테이블: `LicenseRenewalHistory`, `LicenseOwner`, `NotificationLog`
- [ ] AuditLog: `actorType`, `actorId` 컬럼 추가
- [ ] `prisma generate` 실행

### 백엔드 — 신규 API 구현
> `tasks/api-spec.md` 참조
- [x] OrgUnit CRUD: `GET /api/org/units`, `POST`, `PUT /[id]`, `DELETE /[id]`
- [ ] OrgUnit 삭제 프리뷰: `GET /api/org/units/[id]/delete-preview`
- [x] 구성원 조직 이동: `PATCH /api/employees/[id]` (orgUnitId 변경 + AuditLog)
- [ ] 구성원 퇴사 처리: `POST /api/employees/[id]/offboard`
- [ ] 라이선스 갱신 상태 변경: `PUT /api/licenses/[id]/renewal-status`
- [ ] 라이선스 갱신 이력 조회: `GET /api/licenses/[id]/renewal-history`
- [ ] 라이선스 갱신일 수동 설정: `PUT /api/licenses/[id]/renewal-date`
- [ ] 라이선스 담당자 관리: `GET|POST|DELETE /api/licenses/[id]/owners`
- [ ] Admin 비밀번호 리셋: `POST /api/admin/users/[id]/reset-password`
- [ ] Admin 사용자 삭제: `DELETE /api/admin/users/[id]`
- [ ] `GET /api/history` (AuditLog 조회 REST API) 구현 여부 확인

### 백엔드 — 배치/스케줄러
- [ ] OFFBOARDING 자동 삭제 배치 (매일 실행, `offboardingUntil` 경과 구성원 삭제 + tombstone)
- [ ] 라이선스 갱신 알림 스케줄러 (D-70, D-30, D-15, D-7 발송)
  - Slack 발송 (가능 시)
  - Email 발송 (가능 시)
  - NotificationLog 기록 (성공/실패 모두)

### 프론트엔드 — 신규 UI
> 백엔드 API 전체 완료 — 모두 착수 가능
- [ ] OrgUnit 트리 편집 UI — `/org` 페이지에 생성·수정·삭제 버튼 추가
  - 삭제 확인 모달: 하위 부서 목록 + 영향 구성원 수 표시 + "삭제하겠습니다" 문구 입력 요구
  - `GET /api/org/units/[id]/delete-preview` 연동
- [ ] 구성원 조직 이동 UI — 구성원 상세 페이지에서 소속 부서 변경 드롭다운 (`PATCH /api/employees/[id]`)
- [ ] 구성원 퇴사 처리 UI — 퇴사 버튼 + 날짜 선택 모달 (`POST /api/employees/[id]/offboard`)
- [ ] 구성원 중복 이름 구분 표시 (이름 + 이메일 앞부분 마스킹 함께 노출)
- [ ] 라이선스 갱신 상태 변경 UI — 상태 드롭다운 + 메모 입력 (`PUT /api/licenses/[id]/renewal-status`)
- [ ] 라이선스 갱신일 수동 설정 UI (`PUT /api/licenses/[id]/renewal-date`)
- [ ] 라이선스 갱신 이력 뷰 (타임라인 형태, `GET /api/licenses/[id]/renewal-history`)
- [ ] 라이선스 담당자 설정 UI — 개인 또는 부서 지정 (`GET|POST|DELETE /api/licenses/[id]/owners`)
- [ ] Admin 비밀번호 리셋 UI (`POST /api/admin/users/[id]/reset-password`)

### 프론트엔드 — UI 개선
> 기존 API로 바로 착수 가능
- [ ] 라이선스 목록 페이지 페이지네이션 (대량 데이터 대응)
- [ ] 구성원 목록 검색·필터 기능 (이름, 부서, 상태)
- [ ] 모바일 반응형 레이아웃 검토

---

## 진행 중

(없음)

---

## 참고: 주요 페이지 목록

| 경로 | 설명 |
|---|---|
| `/` | `/licenses`로 리다이렉트 |
| `/login` | 로그인 |
| `/dashboard` | 대시보드 |
| `/licenses` | 라이선스 목록 |
| `/licenses/new` | 라이선스 등록 |
| `/licenses/[id]` | 라이선스 상세 |
| `/licenses/[id]/edit` | 라이선스 수정 |
| `/employees` | 조직원 목록 |
| `/employees/new` | 조직원 등록 |
| `/employees/[id]` | 조직원 상세 |
| `/settings/groups` | 그룹 목록 |
| `/settings/groups/new` | 그룹 생성 |
| `/settings/groups/[id]` | 그룹 상세 |
| `/settings/import` | CSV 가져오기 |
| `/org` | 조직도 |
| `/history` | 감사 로그 |
| `/admin/users` | 사용자 관리 (ADMIN) |
