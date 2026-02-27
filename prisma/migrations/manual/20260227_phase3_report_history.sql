-- Phase 3: 보고서 이력

CREATE TABLE ReportHistory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  period      TEXT    NOT NULL,  -- "2026-02" 형식
  format      TEXT    NOT NULL DEFAULT 'PDF',
  s3Key       TEXT,
  status      TEXT    NOT NULL DEFAULT 'PENDING',  -- PENDING | RUNNING | SUCCESS | FAILED
  errorMsg    TEXT,
  generatedBy INTEGER,
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(period, format)
);
CREATE INDEX idx_reporthistory_period ON ReportHistory(period);
