-- Migration 004: managed fabric library (Admin → Fabrics).
-- Run once in phpMyAdmin (import). Safe to re-run (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS fabrics (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_fabrics_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
