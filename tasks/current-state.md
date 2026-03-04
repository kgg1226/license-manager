# 현재 프로젝트 상태

> 🎯 기획 세션이 관리한다. 다른 세션은 **작업 시작 전 반드시 읽는다.**
> 최종 업데이트: 2026-03-04

---

## 브랜치 현황

| 브랜치 | 상태 | 내용 |
|---|---|---|
| `master` | 기준 브랜치 | 아래 브랜치들 머지 전 상태 |
| `claude/backend-development-C6wwi` | ✅ 완료, 머지 대기 | DB 스키마 확장 + 신규 API 전체 |
| `claude/security-improvements-I55Yn` | ✅ 완료, 머지 대기 | 보안 리뷰 + guidelines.md |
| `claude/frontend-work-4WHnC` | ✅ 완료, 머지 대기 | UI 개선 (검색·필터·페이지네이션) |
| `claude/planning-session-S8WrJ` | 🔄 진행 중 | 기획 문서 + 프론트 신규 UI |

---

## 구현 완료된 API (backend-C6wwi 브랜치)

> 아래 API는 `claude/backend-development-C6wwi`에 구현 완료.
> master에 아직 머지 안 됨 — 코드는 `git show origin/claude/backend-development-C6wwi:<경로>` 로 확인 가능.

### OrgUnit
- `GET /api/org/units` — 전체 트리 (companyId 필터)
- `POST /api/org/units` — 생성
- `PUT /api/org/units/[id]` — 이름/정렬순서 수정
- `DELETE /api/org/units/[id]` — cascade 삭제 (`confirm: "삭제하겠습니다"` 필요)
- `GET /api/org/units/[id]/delete-preview` — 삭제 영향 범위 미리보기

### 구성원
- `PATCH /api/employees/[id]` — 조직 이동 (companyId, orgUnitId, title)
- `POST /api/employees/[id]/offboard` — 퇴사 처리 (7일 유예)

### 라이선스 갱신
- `PUT /api/licenses/[id]/renewal-status` — 갱신 상태 변경 + 이력 기록
- `GET /api/licenses/[id]/renewal-history` — 갱신 이력 조회
- `PUT /api/licenses/[id]/renewal-date` — 갱신일 수동 설정 (null이면 자동 복원)

### 라이선스 담당자
- `GET /api/licenses/[id]/owners` — 담당자 목록
- `POST /api/licenses/[id]/owners` — 담당자 추가 (userId 또는 orgUnitId)
- `DELETE /api/licenses/[id]/owners/[ownerId]` — 담당자 제거

### Admin
- `DELETE /api/admin/users/[id]` — 사용자 삭제
- `POST /api/admin/users/[id]/reset-password` — 임시 비밀번호 발급 (응답: `{ tempPassword }`)

### 보안
- 로그인 브루트포스 방어 (`lib/rate-limit.ts`)

---

## DB 스키마 변경 (backend-C6wwi 브랜치)

> 코드는 완성됨. EC2 적용은 사람이 VPN 접속 후 수동 실행 필요.
> `tasks/db-changes.md` [2026-03-04] 항목 참조.

| 테이블 | 변경 내용 |
|---|---|
| `OrgUnit` | `sortOrder`, `updatedAt` 추가; 회사 내 unique(name) |
| `Employee` | `orgUnitId`, `status(ACTIVE/OFFBOARDING/DELETED)`, `offboardingUntil` 추가; `orgId`/`subOrgId` 제거 |
| `User` | `mustChangePassword` 추가 |
| `License` | `renewalDate`, `renewalDateManual`, `renewalStatus` 추가 |
| `LicenseRenewalHistory` | 신규 테이블 |
| `LicenseOwner` | 신규 테이블 |
| `NotificationLog` | 신규 테이블 |
| `AuditLog` | `actorType`, `actorId` 추가 |

---

## 완료된 프론트엔드 (이 세션 + frontend-4WHnC 브랜치)

| 기능 | 브랜치 | 파일 |
|---|---|---|
| OrgUnit 트리 편집 (생성·수정·삭제) | `planning-S8WrJ` | `app/org/org-tree.tsx` |
| 구성원 퇴사 처리 버튼·모달 | `planning-S8WrJ` | `app/employees/[id]/offboard-button.tsx` |
| 라이선스 갱신 상태·일자·이력·담당자 | `planning-S8WrJ` | `app/licenses/[id]/license-renewal.tsx` |
| Admin 임시 비밀번호 발급 | `planning-S8WrJ` | `app/admin/users/user-table.tsx` |
| 라이선스 목록 페이지네이션 | `frontend-4WHnC` | `app/licenses/page.tsx` |
| 구성원 목록 검색·필터 | `frontend-4WHnC` | `app/employees/page.tsx` |
| 구성원 중복이름 구분 표시 | `frontend-4WHnC` | `app/employees/page.tsx` |

---

## 남은 작업

| 항목 | 담당 | 비고 |
|---|---|---|
| 배치/스케줄러 (offboarding 자동삭제, 갱신 알림) | 백엔드 | EC2 실행 불가, 코드 작성만 가능 |
| 모바일 반응형 | 프론트엔드 | 낮은 우선순위 |
| PR 머지 + EC2 배포 | **사람** | VPN 접속 필요 |

---

## 파일 조회 명령어 (다른 브랜치 코드 확인)

```bash
# 백엔드 브랜치의 파일 목록
git show --stat origin/claude/backend-development-C6wwi | head -50

# 특정 API 라우트 확인
git show origin/claude/backend-development-C6wwi:app/api/org/units/[id]/route.ts

# 프론트엔드 브랜치의 변경 파일
git diff origin/master...origin/claude/frontend-work-4WHnC --stat
```
