-- 007-notifications.sql — admin notification centre.
-- Run once in phpMyAdmin (safe to re-run: CREATE TABLE IF NOT EXISTS).
-- Rows are created automatically by the storefront:
--   type 'order'   — a customer places a new order
--   type 'query'   — a new customer query arrives via the contact form
--   type 'account' — a new admin/user account is created
-- The admin bell badge counts rows with isRead = 0.

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  link VARCHAR(255) NOT NULL,
  refId VARCHAR(64) NULL,
  isRead TINYINT(1) NOT NULL DEFAULT 0,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_notifications_created (createdAt),
  INDEX idx_notifications_read (isRead)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
