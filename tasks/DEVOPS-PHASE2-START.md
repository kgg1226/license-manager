# 🔧 DevOps Phase 2 빠른 시작 가이드

> **역할**: DevOps (/devops)
> **Phase**: Phase 2 — Asset Management Abstraction
> **기간**: 2026-03-07 ~ 2026-03-28 (3주)
> **목표**: Asset 기능 배포 및 인프라 최적화

---

## ⚡ 5분 안에 시작하기

### 1. 문서 확인 (필독)
```bash
# 배포 관련
cat DEVOPS-START.md          # 기본 DevOps 가이드
cat tasks/phase2-db-design.md # 마이그레이션 전략

# 빌드 & 배포
cat .github/workflows/*.yml  # CI/CD 파이프라인
cat deploy.ps1              # AWS EC2 배포 스크립트
```

### 2. Branch 전환
```bash
# Planning 역할 worktree에서 DevOps 역할로 전환
/devops

# 또는 수동 worktree 전환
cd /c/license-manager/.claude/worktrees/[role]/
```

### 3. 현재 상태 확인
```bash
# Docker 빌드 테스트
docker build -t license-manager:test .
docker run -p 3000:8080 license-manager:test

# 배포 스크립트 확인
cat deploy.ps1
```

---

## 🎯 Phase 2 DevOps 작업 (4개)

| 순번 | 작업 | 제목 | 난이도 | 예상 기간 | 상태 |
|------|------|------|--------|---------|------|
| 1 | **OPS-010** | Dockerfile & Docker Compose 업데이트 | 🟢 쉬움 | 0.5-1일 | 🔴 오픈 |
| 2 | **OPS-011** | 마이그레이션 스크립트 검증 | 🟡 중간 | 1-2일 | 🔴 오픈 |
| 3 | **OPS-001** | DB 성능 최적화 (인덱싱) | 🟡 중간 | 1-2일 | 🔴 오픈 |
| 4 | **OPS-002** | 모니터링 & 로깅 강화 | 🟠 어려움 | 2-3일 | 🔴 오픈 |

**💡 추천 순서**: OPS-010 → OPS-011 → OPS-001 → OPS-002

---

## 📋 작업 상세 요약

### **OPS-010: Dockerfile & Docker Compose 업데이트** 🟢 쉬움

**목표**: Asset 기능 포함한 Docker 이미지 최신화

**파일**:
- `dockerfile`
- `docker-compose.yml`

**구현 내용**:

1. **Dockerfile 확인**
   - Node.js 버전 확인 (package.json과 호환)
   - 빌드 단계 (build stage)
   - 실행 단계 (runtime stage)
   - 캐시 최적화

2. **Docker Compose 업데이트**
   - DB 서비스 설정 확인 (SQLite)
   - 환경 변수 설정
   - 포트 매핑 확인 (호스트 8080 → 컨테이너 3000)
   - 볼륨 마운트 설정

3. **빌드 테스트**
   ```bash
   docker-compose build
   docker-compose up -d
   curl http://localhost:8080/api/assets  # Asset API 확인
   docker-compose down
   ```

**완료 조건**:
- [ ] Dockerfile 최신화
- [ ] Docker Compose 설정 정확
- [ ] 로컬 빌드 & 실행 정상
- [ ] Asset API 호출 정상
- [ ] 빌드 시간 최적화

---

### **OPS-011: 마이그레이션 스크립트 검증** 🟡 중간

**목표**: DB 스키마 변경 마이그레이션 스크립트 작성 및 테스트

**참고**:
- Backend에서 `prisma migrate dev` 실행
- DevOps는 검증 및 배포 시 실행 스크립트 관리

**구현 내용**:

1. **마이그레이션 파일 확인**
   ```bash
   ls prisma/migrations/
   # 예: 20260307_add_asset_model/migration.sql
   ```

2. **스크립트 작성**
   - `scripts/migrate-prod.sh` (호스트에서 실행)
   - DB 백업 → 마이그레이션 실행 → 검증

3. **테스트 환경 마이그레이션**
   ```bash
   # 개발 DB (SQLite)
   sqlite3 prisma/dev.db < prisma/migrations/*/migration.sql

   # 또는 Prisma CLI
   npx prisma migrate deploy
   ```

4. **데이터 무결성 검증**
   ```sql
   SELECT COUNT(*) FROM "Asset";
   SELECT * FROM "Asset" LIMIT 5;
   SELECT * FROM "Assignment" WHERE "assetId" IS NOT NULL;
   ```

**완료 조건**:
- [ ] 마이그레이션 파일 검증
- [ ] 테스트 환경 마이그레이션 성공
- [ ] 데이터 무결성 확인
- [ ] 롤백 계획 수립

---

### **OPS-001: DB 성능 최적화 (인덱싱)** 🟡 중간

**목표**: Asset 테이블 쿼리 성능 최적화

**구현 내용**:

1. **인덱스 확인** (phase2-db-design.md 참고)
   ```sql
   CREATE INDEX "Asset_type_idx" ON "Asset"("type");
   CREATE INDEX "Asset_status_idx" ON "Asset"("status");
   CREATE INDEX "Asset_expiryDate_idx" ON "Asset"("expiryDate");
   CREATE INDEX "Asset_assignedToId_idx" ON "Asset"("assignedToId");
   ```

2. **쿼리 성능 테스트**
   ```sql
   -- 테스트 데이터 삽입 (1000개)
   INSERT INTO "Asset" (...) VALUES (...);  -- 대량 삽입

   -- 성능 측정
   EXPLAIN QUERY PLAN
   SELECT * FROM "Asset" WHERE "type" = 'SOFTWARE';

   EXPLAIN QUERY PLAN
   SELECT * FROM "Asset" WHERE "expiryDate" < '2026-04-07';
   ```

3. **인덱스 분석 및 최적화**
   - 자주 쿼리되는 필드 우선 인덱싱
   - 복합 인덱스 검토
   - 통계 수집 (ANALYZE)

**완료 조건**:
- [ ] 필요 인덱스 모두 생성
- [ ] 쿼리 성능 측정
- [ ] 성능 개선 확인 (execution plan)

---

### **OPS-002: 모니터링 & 로깅 강화** 🟠 어려움

**목표**: Asset API 실행 모니터링 및 로그 수집

**구현 내용**:

1. **로깅 강화**
   - API 요청/응답 로그 (req body, response time)
   - DB 쿼리 로그 (느린 쿼리 감지)
   - 에러 로그 (stack trace 포함)

2. **모니터링 지표**
   - 응답 시간 (latency)
   - 요청/초 (throughput)
   - 에러율 (error rate)
   - DB 연결 풀 상태

3. **구현 예**
   ```typescript
   // lib/logger.ts
   export function logApiCall(req: Request, res: Response, duration: number) {
     console.log({
       timestamp: new Date().toISOString(),
       method: req.method,
       path: req.url,
       status: res.status,
       duration_ms: duration,
       user_id: getCurrentUser()?.id
     });
   }
   ```

4. **대시보드 구성** (선택사항)
   - 주요 지표 시각화
   - 실시간 로그 뷰
   - 알림 설정 (에러율 > 5% 등)

**완료 조건**:
- [ ] API 로깅 구현
- [ ] DB 느린 쿼리 로깅
- [ ] 모니터링 지표 수집
- [ ] 로그 분석 및 개선점 식별

---

## 🔄 개발 흐름

### 1. 로컬 빌드 & 테스트
```bash
# Docker 빌드
docker build -t license-manager:test .

# 컨테이너 실행
docker run -p 3000:8080 license-manager:test

# API 테스트
curl http://localhost:3000/api/assets
```

### 2. 마이그레이션 검증
```bash
# Backend에서 마이그레이션 파일 생성
# (Backend 담당)
npx prisma migrate dev --name "add_asset_model"

# DevOps에서 검증
npx prisma migrate deploy --preview-feature
sqlite3 prisma/dev.db ".tables"
```

### 3. 성능 최적화
```bash
# 인덱스 생성
sqlite3 prisma/dev.db < scripts/create-indexes.sql

# 성능 측정
sqlite3 prisma/dev.db "EXPLAIN QUERY PLAN SELECT * FROM Asset WHERE type='SOFTWARE';"
```

### 4. 모니터링 설정
```bash
# 로깅 구현
# lib/logger.ts 작성

# 테스트
npm run dev
# API 호출 후 로그 확인
```

---

## ✅ 완료 기준

### OPS-010 완료 체크리스트
- [ ] Dockerfile 최신화
- [ ] Docker Compose 설정 정확
- [ ] 로컬 빌드 성공
- [ ] 컨테이너 실행 성공
- [ ] API 호출 정상

### OPS-011 완료 체크리스트
- [ ] 마이그레이션 파일 생성
- [ ] 테스트 환경 마이그레이션 성공
- [ ] 데이터 무결성 확인
- [ ] 롤백 계획 수립

### OPS-001 완료 체크리스트
- [ ] Asset 테이블 인덱스 생성
- [ ] Assignment 테이블 인덱스 확인
- [ ] 쿼리 성능 측정
- [ ] 성능 개선 확인

### OPS-002 완료 체크리스트
- [ ] API 로깅 구현
- [ ] DB 쿼리 로깅
- [ ] 모니터링 지표 수집
- [ ] 로그 분석 및 개선

---

## 📚 참고 자료

- **phase2-db-design.md**: 스키마 설계 및 마이그레이션 전략
- **DEVOPS-START.md**: DevOps 기본 가이드
- **deploy.ps1**: AWS EC2 배포 스크립트
- **docker-compose.yml**: 컨테이너 설정
- **dockerfile**: 빌드 설정

---

## 🚀 AWS EC2 배포

### 배포 전체 프로세스

```bash
# 1. 로컬 빌드 & 테스트 완료
docker build -t license-manager:latest .
docker-compose up -d
# 테스트...
docker-compose down

# 2. GitHub push
git add .
git commit -m "Phase 2: Asset management implementation"
git push origin master

# 3. EC2 배포 (Windows PowerShell)
# EC2 인스턴스에서:
cd C:\license-manager
.\deploy.ps1

# 4. 배포 후 검증
curl http://ec2-instance-ip:8080/api/assets
```

### 배포 체크리스트
- [ ] 로컬 테스트 완료
- [ ] GitHub에 push
- [ ] EC2 인스턴스 상태 확인
- [ ] deploy.ps1 실행
- [ ] 배포 후 API 호출 정상
- [ ] 로그 확인 (에러 없음)
- [ ] 모니터링 대시보드 확인

---

## 💬 Q&A

**Q: Prisma migrate vs raw SQL?**
A: 개발: Prisma migrate, 운영: raw SQL (안전성). Backend에서 migrate 생성 후 DevOps가 검증.

**Q: 인덱스는 언제 생성?**
A: 마이그레이션 후, 성능 측정 전. 대량 데이터 없을 시 미리 생성 (영향 없음).

**Q: 로그는 어디에 저장?**
A: 파일: `logs/api.log`. 대규모는 ELK Stack, Datadog 등.

---

## 🎯 성공 기준

Phase 2 DevOps 완료:
1. ✅ Docker 이미지 최신화
2. ✅ 마이그레이션 검증 완료
3. ✅ 성능 최적화 적용
4. ✅ 모니터링 설정 완료
5. ✅ 배포 준비 완료

---

## 🚀 다음 단계

1. **OPS-010 완료** (1일)
2. **OPS-011 완료** (1-2일)
3. **OPS-001 완료** (1-2일)
4. **OPS-002 완료** (2-3일)
5. **배포 준비** (1일)

**예상 완료 일정**: 2026-03-17 (1.5주)

---

**시작하기**: `/devops` 명령어로 DevOps 역할로 전환 후, OPS-010부터 시작하세요! 🚀
