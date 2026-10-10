/* Sofora MySQL schema (MariaDB-compatible).
   ------------------------------------------------------------------
   Import into the Hostinger database via hPanel → phpMyAdmin → Import,
   or:  mysql -h <host> -u <user> -p <db> < db/schema.sql

   Dates are ISO-8601 strings (VARCHAR) — the app compares/sorts them as
   strings, exactly like the Firestore version did. JSON-ish fields are
   TEXT columns holding JSON strings (MariaDB-safe). Booleans are TINYINT(1).
   Idempotent: every statement uses IF NOT EXISTS. */

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  sub TEXT NULL,
  description MEDIUMTEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  wasPrice DECIMAL(10,2) NULL,
  category VARCHAR(128) NULL,
  type VARCHAR(32) NULL,
  fabric VARCHAR(32) NULL,
  fabricName VARCHAR(128) NULL,
  bg VARCHAR(32) NULL,
  accent VARCHAR(32) NULL,
  tag VARCHAR(128) NULL,
  imageUrl TEXT NULL,
  colorImages TEXT NULL,
  sku VARCHAR(64) NULL,
  seats TINYINT NULL,
  fabricType VARCHAR(64) NULL,
  colourName VARCHAR(64) NULL,
  features TEXT NULL,
  rating DECIMAL(3,2) NULL,
  reviewCount INT NULL,
  inStock TINYINT(1) NOT NULL DEFAULT 1,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  details TEXT NULL,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_products_category (category),
  INDEX idx_products_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NULL,
  fabric VARCHAR(32) NULL,
  bg VARCHAR(32) NULL,
  blurb TEXT NULL,
  menu VARCHAR(128) NULL,
  imageUrl TEXT NULL,
  INDEX idx_categories_menu (menu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS colors (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  hex VARCHAR(16) NULL,
  imageUrl TEXT NULL,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_colors_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_reviews (
  id VARCHAR(80) PRIMARY KEY,
  productId VARCHAR(64) NOT NULL,
  productSlug VARCHAR(160) NULL,
  productName VARCHAR(255) NULL,
  author VARCHAR(128) NOT NULL,
  location VARCHAR(128) NULL,
  rating TINYINT NOT NULL DEFAULT 5,
  title VARCHAR(255) NULL,
  body MEDIUMTEXT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  createdAt VARCHAR(32) NULL,
  INDEX idx_reviews_product (productId),
  INDEX idx_reviews_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS queries (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  subject VARCHAR(255) NULL,
  message MEDIUMTEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'new',
  reply MEDIUMTEXT NULL,
  repliedAt VARCHAR(32) NULL,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_queries_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  type VARCHAR(16) NOT NULL DEFAULT 'percent',
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  minSubtotal DECIMAL(10,2) NULL,
  maxUses INT NULL,
  usedCount INT NOT NULL DEFAULT 0,
  startsAt VARCHAR(32) NULL,
  endsAt VARCHAR(32) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_coupons_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flash_sales (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT NULL,
  imageUrl TEXT NULL,
  linkUrl TEXT NULL,
  linkLabel VARCHAR(128) NULL,
  startsAt VARCHAR(32) NULL,
  endsAt VARCHAR(32) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_flash_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  content MEDIUMTEXT NULL,
  coverColor VARCHAR(16) NULL,
  tags TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  metaTitle VARCHAR(255) NULL,
  metaDescription TEXT NULL,
  publishedAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  readingMinutes INT NOT NULL DEFAULT 1,
  authorName VARCHAR(128) NULL,
  faqJson MEDIUMTEXT NULL,
  INDEX idx_posts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  quote TEXT NULL,
  author VARCHAR(128) NULL,
  location VARCHAR(128) NULL,
  rating TINYINT NOT NULL DEFAULT 5,
  `order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  number VARCHAR(32) NOT NULL UNIQUE,
  publicToken VARCHAR(64) NOT NULL,
  items MEDIUMTEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  deliveryFee DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NULL,
  couponCode VARCHAR(64) NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  customer MEDIUMTEXT NOT NULL,
  deliverySlot VARCHAR(128) NULL,
  paymentMethod VARCHAR(32) NOT NULL DEFAULT 'cash',
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  timeline MEDIUMTEXT NULL,
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL,
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  email VARCHAR(255) PRIMARY KEY,
  password TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'user',
  createdAt VARCHAR(32) NULL,
  updatedAt VARCHAR(32) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(32) PRIMARY KEY,
  announcementBar TEXT NULL,
  freeDeliveryThreshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  acceptedPayments TEXT NULL,
  deliveryTimeText TEXT NULL,
  confirmationCallText TEXT NULL,
  refusalPolicy MEDIUMTEXT NULL,
  phone VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  trustpilotRating VARCHAR(32) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Order-number counter (replaces the Firestore meta/counters doc). */
CREATE TABLE IF NOT EXISTS counters (
  id VARCHAR(32) PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 1001
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO counters (id, value) VALUES ('orderSeq', 1001);

CREATE TABLE IF NOT EXISTS faqs (
  id VARCHAR(64) PRIMARY KEY,
  q TEXT NOT NULL,
  a MEDIUMTEXT NULL,
  `order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
