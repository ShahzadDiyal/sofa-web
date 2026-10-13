-- 008-audit-logs.sql — admin activity audit trail.
-- Run once in phpMyAdmin (safe to re-run: CREATE TABLE IF NOT EXISTS).
-- Every significant admin action is recorded: which admin, what action,
-- which record, a human-readable summary, and optional JSON details.

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  adminEmail VARCHAR(255) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity VARCHAR(32) NULL,
  entityId VARCHAR(64) NULL,
  summary VARCHAR(255) NOT NULL,
  details MEDIUMTEXT NULL,
  ip VARCHAR(64) NULL,
  createdAt VARCHAR(32) NULL,
  INDEX idx_audit_created (createdAt),
  INDEX idx_audit_action (action),
  INDEX idx_audit_admin (adminEmail)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
