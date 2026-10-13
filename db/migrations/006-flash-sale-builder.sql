-- Migration 006: flash-sale banner builder fields
-- (template, animation, display mode, closeable, background, custom HTML/CSS,
--  product + page targeting). Run once in phpMyAdmin (import). Safe to re-run.
ALTER TABLE flash_sales
  ADD COLUMN template VARCHAR(16) NULL,
  ADD COLUMN animation VARCHAR(16) NULL,
  ADD COLUMN displayMode VARCHAR(16) NULL,
  ADD COLUMN closeable TINYINT(1) NULL,
  ADD COLUMN bgColor VARCHAR(128) NULL,
  ADD COLUMN contentHtml MEDIUMTEXT NULL,
  ADD COLUMN customCss MEDIUMTEXT NULL,
  ADD COLUMN productIds TEXT NULL,
  ADD COLUMN pages TEXT NULL;
