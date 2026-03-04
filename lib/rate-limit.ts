/**
 * 인메모리 로그인 Rate Limiter
 * - 5회 연속 실패 시 15분 잠금
 * - key: IP 주소 (또는 username)
 * - 메모리 누수 방지: 만료된 항목 자동 정리
 */

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15분
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5분마다 정리

interface AttemptRecord {
  count: number;
  lockedUntil: number | null; // timestamp ms
}

const store = new Map<string, AttemptRecord>();

// 만료 항목 정리 (메모리 누수 방지)
function cleanup() {
  const now = Date.now();
  for (const [key, rec] of store.entries()) {
    if (rec.lockedUntil !== null && rec.lockedUntil <= now) {
      store.delete(key);
    } else if (rec.count === 0) {
      store.delete(key);
    }
  }
}

// Node 환경에서 주기적으로 정리 (Next.js 서버는 장기 실행)
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, CLEANUP_INTERVAL_MS).unref?.();
}

export function isRateLimited(key: string): boolean {
  const rec = store.get(key);
  if (!rec) return false;
  if (rec.lockedUntil === null) return false;
  if (Date.now() < rec.lockedUntil) return true;
  // 잠금 해제
  store.delete(key);
  return false;
}

/** 실패 기록. 잠금 상태면 남은 시간(ms) 반환, 아니면 0 */
export function recordFailure(key: string): number {
  if (isRateLimited(key)) {
    const rec = store.get(key)!;
    return rec.lockedUntil! - Date.now();
  }

  const rec = store.get(key) ?? { count: 0, lockedUntil: null };
  rec.count += 1;

  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCK_DURATION_MS;
    rec.count = 0;
    store.set(key, rec);
    return LOCK_DURATION_MS;
  }

  store.set(key, rec);
  return 0;
}

export function clearAttempts(key: string): void {
  store.delete(key);
}

/** 남은 잠금 시간(초). 잠금 중이 아니면 0 */
export function getRemainingLockSeconds(key: string): number {
  const rec = store.get(key);
  if (!rec || rec.lockedUntil === null) return 0;
  const remaining = rec.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
