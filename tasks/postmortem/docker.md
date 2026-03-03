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

## PM-D-002: (템플릿)

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
