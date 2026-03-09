#!/bin/bash
# Worktree 초기화 스크립트
# 새 worktree 생성 후 실행: ./scripts/init-worktree.sh
# 또는 기존 worktree에서 tasks/ 동기화: ./scripts/init-worktree.sh

set -e

echo "🔄 Worktree 초기화 중..."

# 현재 worktree 감지
WORKTREE_PATH=$(git rev-parse --git-dir)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "📍 현재 worktree: $WORKTREE_PATH"
echo "📌 현재 branch: $CURRENT_BRANCH"

# master의 tasks/ 폴더를 현재 worktree로 병합
echo "📥 master의 tasks/ 폴더를 병합 중..."
git merge origin/master --no-commit --no-ff -- tasks/ 2>/dev/null || {
  echo "⚠️  병합 충돌이 있거나 파일이 없습니다. origin/master에서 tasks/ 복사 중..."
  git show origin/master:tasks/ 2>/dev/null || echo "tasks/ 폴더가 origin/master에 없습니다."

  # 대체 방법: origin/master에서 직접 checkout
  git checkout origin/master -- tasks/ 2>/dev/null || echo "⚠️  tasks/ 복사 실패. 수동 병합 필요."
}

echo "✅ Worktree 초기화 완료!"
echo ""
echo "📋 다음 명령어로 tasks/ 문서를 확인할 수 있습니다:"
echo "   cat tasks/$(basename $CURRENT_BRANCH)-START.md"
echo ""
