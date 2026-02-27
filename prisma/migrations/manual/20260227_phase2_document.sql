-- Phase 2: 문서 관리

CREATE TABLE Document (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  licenseId   INTEGER NOT NULL REFERENCES License(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL DEFAULT 'OTHER',  -- CONTRACT | QUOTE | OTHER
  filename    TEXT    NOT NULL,
  s3Key       TEXT    NOT NULL UNIQUE,
  sizeBytes   INTEGER,
  uploadedBy  INTEGER NOT NULL REFERENCES User(id),
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_document_licenseId ON Document(licenseId);
