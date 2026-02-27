-- Phase 1: Renewal 자동화 + 알림
-- License 테이블에 갱신 관련 필드 추가

ALTER TABLE License ADD COLUMN firstPurchasedAt TEXT;
ALTER TABLE License ADD COLUMN lastRenewedAt TEXT;
ALTER TABLE License ADD COLUMN renewalDate TEXT;
ALTER TABLE License ADD COLUMN renewalCycle TEXT NOT NULL DEFAULT 'ANNUAL';
ALTER TABLE License ADD COLUMN cycleMonths INTEGER;

CREATE INDEX idx_license_renewalDate ON License(renewalDate);

-- 기존 데이터 백필: purchaseDate → firstPurchasedAt, expiryDate → renewalDate
UPDATE License SET firstPurchasedAt = purchaseDate WHERE firstPurchasedAt IS NULL;
UPDATE License SET renewalDate = expiryDate WHERE expiryDate IS NOT NULL AND renewalDate IS NULL;

-- RenewalEvent: 갱신 처리 이력
CREATE TABLE RenewalEvent (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  licenseId   INTEGER NOT NULL REFERENCES License(id) ON DELETE CASCADE,
  renewedAt   TEXT    NOT NULL,
  nextDueAt   TEXT    NOT NULL,
  note        TEXT,
  createdBy   INTEGER REFERENCES User(id),
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_renewalevent_licenseId ON RenewalEvent(licenseId);

-- NotificationLog: 알림 발송 기록 (중복 방지)
CREATE TABLE NotificationLog (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  licenseId   INTEGER NOT NULL REFERENCES License(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL,  -- 'D60' | 'D30'
  sentAt      TEXT,
  status      TEXT    NOT NULL DEFAULT 'PENDING',  -- PENDING | SENT | FAILED | SKIPPED
  retryCount  INTEGER NOT NULL DEFAULT 0,
  errorMsg    TEXT,
  targetEmail TEXT    NOT NULL,
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(licenseId, type, targetEmail)
);
CREATE INDEX idx_notiflog_licenseId ON NotificationLog(licenseId);
