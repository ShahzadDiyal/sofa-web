-- Sofora migration 002: footer/branding/legal-page settings columns.
-- Run once in phpMyAdmin → SQL on u635812720_sofaweb (safe to re-run).

ALTER TABLE `settings`
  ADD COLUMN IF NOT EXISTS `footerTagline` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `footerMenus` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `legalLinks` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `copyrightText` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `footerHtml` MEDIUMTEXT NULL,
  ADD COLUMN IF NOT EXISTS `logoUrl` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `faviconUrl` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `privacyHtml` MEDIUMTEXT NULL,
  ADD COLUMN IF NOT EXISTS `termsHtml` MEDIUMTEXT NULL,
  ADD COLUMN IF NOT EXISTS `cookiesHtml` MEDIUMTEXT NULL;
