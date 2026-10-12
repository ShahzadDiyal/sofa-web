-- Sofora migration 003: blog post cover image column.
-- Run once in phpMyAdmin → SQL on u635812720_sofaweb (safe to re-run).
-- Lets each blog post have a real cover photo (upload or paste link in
-- Admin → Blog); the SVG illustration stays as the fallback when empty.

ALTER TABLE `posts`
  ADD COLUMN IF NOT EXISTS `coverImage` TEXT NULL;
