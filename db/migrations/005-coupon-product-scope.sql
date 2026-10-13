-- Migration 005: coupon product scoping (Admin → Coupons → Applies to).
-- Run once in phpMyAdmin (import). Safe to re-run.
ALTER TABLE coupons ADD COLUMN productIds TEXT NULL;
