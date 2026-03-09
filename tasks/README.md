# 📚 Tasks & Documentation Guide

> **이 폴더는 Planning Role이 관리하는 모든 작업 문서의 중심입니다.**
>
> 각 Role은 **자신의 역할에 맞는 문서를 참고**하면서 작업을 진행합니다.

---

## 🎯 모든 Role이 먼저 읽을 문서

### 1. **`VISION.md`** ⭐ (필수)
> 프로젝트의 최종 비전과 목표

**포함 내용**:
- 사용자의 원래 목표 (정보자산 통합관리 + 월별 증적)
- 5단계 로드맵 (Phase 1-5)
- 현재 상태 (2026-03-07)
- 규정 준수 (ISO27001, ISMS-P)
- 팀 역할 가이드라인

**언제 읽어야 함**:
- ✅ 작업 시작 전 (프로젝트 이해)
- ✅ 헷갈릴 때 (비전 확인)
- ✅ 매달 (진행률 체크)

**읽는 사람**: 모든 Role

---

### 2. **`TICKETS.md`** ⭐ (필수)
> 현재 진행 중인 활성 티켓

**포함 내용**:
- 8개 활성 티켓
- Role별 할당 (Backend 2개, Frontend 2개, DevOps 4개)
- 각 티켓의 상세 요구사항, 완료 조건
- 예상 기간 및 진행 순서

**언제 읽어야 함**:
- ✅ 역할 정해진 후 (할당된 티켓 확인)
- ✅ 매일 (진행 상황 확인)
- ✅ 상세 요구사항 필요할 때

**읽는 사람**: 모든 Role

---

## 👨‍💻 Role별 가이드

### 🎯 Planning Role

**관리 책임**:
- ✅ VISION.md - 비전 유지
- ✅ TICKETS.md - 티켓 생성/업데이트
- ✅ todo.md - Phase별 roadmap 관리
- ✅ current-state.md - 현재 상태 보고
- ✅ features/*.md - 각 phase 스펙 작성

**확인 문서**:
1. VISION.md (자신이 작성)
2. TICKETS.md (자신이 작성)
3. todo.md (자신이 관리)
4. lessons.md (팀 학습 기록)

**업데이트 주기**:
- 일일: 진행 상황 모니터링
- 주간: current-state.md 업데이트
- Phase 완료: todo.md & VISION.md 동기화

---

### 🔵 Backend Role

**할당된 티켓 확인**:
```
TICKETS.md → "⚙️ BACKEND 티켓" 섹션
├─ BE-ORG-001: PUT /api/org/companies/[id]
└─ BE-ORG-002: DELETE /api/org/companies/[id]
```

**참고 문서** (우선순위):
1. **`TICKETS.md`** ← 상세 요구사항, 완료 조건
2. **`features/org-and-dashboard-improvements.md`** ← 조직 관리 스펙
3. **`features/information-asset-platform-evolution.md`** ← 아키텍처
4. **`VISION.md`** ← 전체 맥락 이해
5. **`api-spec.md`** ← API 명세

**체크리스트**:
- [ ] TICKETS.md에서 할당된 티켓 확인
- [ ] 각 티켓의 "요구사항" 섹션 읽기
- [ ] "기술 사항" 섹션으로 구현 준비
- [ ] "완료 조건" 충족 여부 검증
- [ ] Git commit 메시지에 티켓 번호 포함 (예: `[BE-ORG-001] Implement...`)

**진행 중 질문**:
- 스펙 불명확? → Planning Role에 TICKETS.md 업데이트 요청
- 아키텍처 의문? → `features/information-asset-platform-evolution.md` 참고
- 통합 관점? → VISION.md의 Phase별 목표 확인

---

### 🎨 Frontend Role

**할당된 티켓 확인**:
```
TICKETS.md → "🎯 FRONTEND 티켓" 섹션
├─ FE-001: mustChangePassword 강제 비밀번호 변경 UI
└─ FE-ORG-001: /org 페이지 — Company CRUD UI
```

**참고 문서** (우선순위):
1. **`TICKETS.md`** ← UI 요구사항, 모달 디자인
2. **`features/org-and-dashboard-improvements.md`** ← UI 구조, 스크린 레이아웃
3. **`features/information-asset-platform-evolution.md`** ← 전체 UI 아키텍처
4. **`VISION.md`** ← 프로젝트 비전
5. **`api-spec.md`** ← API 호출 방식

**체크리스트**:
- [ ] TICKETS.md에서 할당된 티켓 확인
- [ ] "요구사항" 섹션의 모달/화면 설계 읽기
- [ ] "완료 조건"에서 UI/UX 검증 항목 확인
- [ ] Backend와 협력 (API 완료 후 시작)
- [ ] Git commit 메시지에 티켓 번호 포함 (예: `[FE-ORG-001] Implement...`)

**진행 중 질문**:
- 디자인 불명확? → TICKETS.md의 모달 ASCII 아트 참고
- 반응형 요구사항? → features 문서의 UI 섹션 확인
- 전체 흐름? → VISION.md의 네비게이션 구조 확인

---

### 🟢 DevOps Role

**할당된 티켓 확인**:
```
TICKETS.md → "🔧 DEVOPS 티켓" 섹션
├─ OPS-010: deploy.sh / docker-compose.yml — SQLite 볼륨 제거
├─ OPS-011: .env.example 생성
├─ OPS-001: dockerfile — 비root USER 추가
└─ OPS-002: .dockerignore 점검
```

**참고 문서** (우선순위):
1. **`TICKETS.md`** ← 각 티켓의 기술 사항, 파일 목록
2. **`.claude/launch.json`** ← dev server 설정
3. **`CLAUDE.md`** ← 프로젝트 배포 고려사항
4. **`VISION.md`** ← 배포 환경, 규정 준수

**체크리스트**:
- [ ] TICKETS.md에서 할당된 4개 티켓 확인
- [ ] 각 티켓의 "요구사항" 섹션 검토
- [ ] "참고 파일" 목록으로 영향 범위 파악
- [ ] 테스트 환경에서 검증
- [ ] Git commit 메시지에 티켓 번호 포함 (예: `[OPS-010] Remove...`)

**진행 중 질문**:
- Docker 설정 불명확? → TICKETS.md의 기술 사항 참고
- 배포 환경? → CLAUDE.md의 "프로덕션 배포 고려사항" 섹션
- 전체 배포 흐름? → VISION.md의 Phase 4 항목 확인

---

### 🔒 Security Role

**검토 대상**:
- VISION.md - 규정 준수 요구사항 (ISO27001, ISMS-P)
- features/information-asset-platform-evolution.md - 아키텍처 보안
- tasks/security/guidelines.md - 보안 규칙 정의

**언제 개입**:
- ✅ 각 Phase 시작 전 (보안 review)
- ✅ 민감한 데이터 처리 시 (권한, 암호화)
- ✅ 배포 직전 (보안 체크리스트)

---

## 📚 문서 구조

```
tasks/
├─ README.md ← 지금 읽는 문서
├─ VISION.md ← 전체 비전 (모두 필독)
├─ TICKETS.md ← 활성 티켓 (모두 필독)
├─ todo.md ← Phase별 roadmap
├─ current-state.md ← 현재 상태
├─ lessons.md ← 팀 학습 기록
├─ api-spec.md ← API 명세
├─ db-changes.md ← DB 변경 이력
├─ security/
│   └─ guidelines.md ← 보안 규칙
└─ features/
    ├─ information-asset-platform-evolution.md ← 전체 아키텍처
    ├─ org-and-dashboard-improvements.md ← 조직+대시보드
    ├─ asset-management.md ← Phase 2 자산 확장
    ├─ monthly-report.md ← Phase 3 보고서
    └─ asset-archiving.md ← Phase 4 증적
```

---

## 🚀 시작하기 (각 Role별)

### Backend
```
1. TICKETS.md 열기 → "⚙️ BACKEND 티켓" 섹션
2. BE-ORG-001 요구사항 읽기
3. features/org-and-dashboard-improvements.md 참고
4. 코딩 시작 → [BE-ORG-001] 커밋
```

### Frontend
```
1. TICKETS.md 열기 → "🎯 FRONTEND 티켓" 섹션
2. FE-001 또는 FE-ORG-001 요구사항 읽기
3. features/org-and-dashboard-improvements.md의 UI 섹션 참고
4. Backend 완료 대기 후 시작
5. 코딩 시작 → [FE-ORG-001] 커밋
```

### DevOps
```
1. TICKETS.md 열기 → "🔧 DEVOPS 티켓" 섹션
2. OPS-010/011/001/002 "참고 파일" 목록 확인
3. 각 파일 검토 및 수정
4. 테스트 환경에서 검증
5. 완료 → [OPS-010] 커밋
```

### Planning (자신)
```
1. VISION.md 유지 (변경 없음)
2. TICKETS.md 업데이트 필요시 수정
3. 매일 진행 상황 모니터링
4. 주간 current-state.md 업데이트
5. Phase 완료 시 todo.md 동기화
```

---

## 📍 자주 묻는 질문

### Q: 내 역할이 어떤 문서를 봐야 하나요?
**A**: 위의 "Role별 가이드"에서 자신의 역할을 찾아 "참고 문서" 순서대로 읽으세요.

### Q: 티켓의 상세 요구사항은?
**A**: `TICKETS.md`의 해당 티켓 섹션에서 "요구사항" 부분을 읽으세요.

### Q: 전체 프로젝트 목표가 뭐죠?
**A**: `VISION.md`의 "사용자의 원래 목표" 섹션을 읽으세요.

### Q: Phase 별로 뭘 해야 하나요?
**A**: `todo.md`에서 현재 Phase를 찾아 체크리스트를 확인하세요.

### Q: 지금 뭘 해야 하나요?
**A**: `TICKETS.md`를 열어서 자신의 역할 섹션의 "🔴 오픈" 상태 티켓을 보세요.

### Q: 다른 팀과 협력할 때는?
**A**: `features/*.md` 파일에서 해당 feature의 스펙을 함께 읽으세요.

---

## ✅ 체크리스트: 역할 시작 전

- [ ] `VISION.md` 읽음 (프로젝트 비전 이해)
- [ ] `TICKETS.md` 읽음 (할당된 티켓 확인)
- [ ] 자신의 역할별 "참고 문서" 목록 북마크
- [ ] Planning Role과 커뮤니케이션 채널 확인
- [ ] 질문사항이 있으면 Planning Role에 연락

---

## 📞 Planning Role과 소통

**뭔가 명확하지 않으면**:
- TICKETS.md의 해당 섹션 업데이트 요청
- features/*.md의 상세 내용 추가 요청
- 스펙 검증 (API, 데이터베이스, UI)

**완료 후**:
- Git commit 메시지에 티켓 번호 포함
- PR 생성 시 TICKETS.md 링크 포함
- current-state.md에서 Planning이 진행 상황 업데이트

---

**시작할 준비가 되셨나요? 자신의 역할을 선택하고 TICKETS.md를 여세요!** 🚀

마지막 업데이트: 2026-03-07
