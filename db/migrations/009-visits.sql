-- 009-visits.sql — visitor tracking for the chat widget.
-- Run once in phpMyAdmin (safe to re-run: CREATE TABLE IF NOT EXISTS).
-- A row is recorded every time a visitor opens the chat popup:
-- name/email/phone stay NULL (shown as "Guest") until the visitor
-- identifies themselves via the chat form.

CREATE TABLE IF NOT EXISTS visits (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  page VARCHAR(512) NOT NULL,
  ip VARCHAR(64) NULL,
  country VARCHAR(128) NULL,
  region VARCHAR(128) NULL,
  city VARCHAR(128) NULL,
  timeOnSite INT NULL,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_visits_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
