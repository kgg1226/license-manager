#!/bin/bash
# tasks/ 폴더 동기화 스크립트
# 모든 worktree의 tasks/ 폴더를 master와 동기화
# 사용: ./scripts/sync-tasks.sh

set -e

echo "🔄 모든 worktree의 tasks/ 폴더를 동기화 중..."
echo ""

# 현재 branch 저장
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# 모든 worktree 나열
WORKTREES=$(git worktree list --porcelain | grep -v "^prune" | awk '{print $2}')

for WORKTREE_PATH in $WORKTREES; do
  if [ -z "$WORKTREE_PATH" ]; then
    continue
  fi

  # worktree 이름 추출 (마지막 디렉토리)
  WORKTREE_NAME=$(basename "$WORKTREE_PATH")

  echo "📍 $WORKTREE_NAME ($WORKTREE_PATH)"

  # worktree로 이동
  cd "$WORKTREE_PATH"

  # 현재 branch 확인
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")

  if [ "$CURRENT_BRANCH" = "master" ]; then
    echo "  ✅ 이미 master branch입니다. 스킵."
  else
    echo "  📥 branch: $CURRENT_BRANCH에서 master의 tasks/ 병합 중..."

    # origin/master의 tasks/ 파일들을 현재 branch로 checkout
    git fetch origin master 2>/dev/null || true
    git checkout origin/master -- tasks/ 2>/dev/null || {
      echo "  ⚠️  tasks/ 동기화 실패. 수동 확인 필요."
    }
  fi

  echo ""
done

echo "✅ 모든 worktree 동기화 완료!"
echo ""
echo "💡 Tip: 각 worktree에서 다음 명령어를 실행하면 자동 초기화됩니다:"
echo "   ./scripts/init-worktree.sh"
echo ""
