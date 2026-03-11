# 포스트모템 — 빌드 / Docker

> 빌드 실패, Docker 이미지 관련, OOM, 의존성 충돌 등

---

## PM-D-001: Docker 빌드 시 OOM Kill

- **상태**: ✅ 해결
- **날짜**: (최초 발생일)
- **세션**: 백엔드

### 증상
`docker build` 도중 프로세스가 강제 종료됨. `dmesg`에 OOM killer 로그.

### 원인
EC2 t4g.small (RAM 2GB)에서 Next.js 빌드의 메모리 사용량이 2GB를 초과.

### 해결
빌드 전 2GB 스왑 파일 생성:
```bash
sudo dd if=/dev/zero of=/swapfile bs=128M count=16
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 예방
- 빌드 전 `free -h`로 스왑 확인을 습관화
- `license-manager-deploy` 스킬에 스왑 체크 단계 포함됨

### 관련 파일
- `dockerfile`
- `docker-compose.yml`

---

## PM-D-002: dockerfile 비root 사용자 오류 (nodejs → node)

- **상태**: ✅ 해결
- **날짜**: 2026-03-10
- **세션**: DevOps

### 증상
`docker compose build` 중 runner 스테이지에서 실패:
```
RUN chown -R nodejs:nodejs /app
chown: unknown user/group nodejs:nodejs
```

### 원인
- `node:20-alpine` 이미지의 내장 비root 사용자명은 `node`
- `nodejs`는 해당 이미지에 존재하지 않는 사용자명

### 해결
```dockerfile
# 수정 전
RUN chown -R nodejs:nodejs /app
USER nodejs

# 수정 후
RUN chown -R node:node /app
USER node
```

### 예방
- `node:*-alpine` 계열 이미지에서 비root 사용자는 항상 `node` (UID 1000)
- `USER nodejs` 사용 금지 — `USER node` 고정

### 관련 파일
- `dockerfile`

---

## PM-D-003: docker-compose up 시 컨테이너 이름 충돌

- **상태**: ✅ 해결
- **날짜**: 2026-03-10
- **세션**: DevOps

### 증상
```
Error response from daemon: Conflict. The container name "/postgres" is already in use
```
기존 컨테이너가 Exited 상태로 남아 있어 `docker compose up` 실패.

### 원인
이전 배포의 컨테이너가 정리되지 않은 채 잔존.
`docker compose up`만 실행하면 기존 컨테이너를 재사용하려다 충돌 발생.

### 해결
배포 시 항상 `down → up` 순서로 실행:
```bash
sudo docker compose down      # 컨테이너·네트워크 제거 (볼륨 유지)
sudo docker compose up -d --build
```

### 예방
- 반복 배포 표준 절차: **`down` 먼저, 그 다음 `up`**
- `docker compose down -v`는 볼륨까지 삭제 → DB 초기화 위험 → **절대 사용 금지**
- `deploy.ps1` EC2 안내문에 `down` 단계 포함 완료

### 관련 파일
- `deploy.ps1`
- `docker-compose.yml`

---

## PM-D-004: (템플릿)

- **상태**: ✅ 해결 / 🔧 미해결
- **날짜**: YYYY-MM-DD
- **세션**: 기획 / 프론트 / 백엔드

### 증상
(무엇이 어떻게 실패했는가)

### 원인
(근본 원인 — "왜"를 최소 2단계 파고들 것)

### 해결
(구체적으로 무엇을 변경했는가, 코드/명령어 포함)

### 예방
(다시 발생하지 않으려면 어떤 규칙/체크를 따라야 하는가)

### 관련 파일
(변경된 파일 경로 목록)
