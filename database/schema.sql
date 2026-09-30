-- =============================================
-- ROAMEO DATABASE SCHEMA
-- =============================================

CREATE DATABASE IF NOT EXISTS roameo;
USE roameo;

-- ---------------------------------------------
-- Table: roles
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,   -- e.g. admin, vendor, customer
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default roles
INSERT IGNORE INTO roles (id, name) VALUES
    (1, 'admin'),
    (2, 'vendor'),
    (3, 'customer');

-- ---------------------------------------------
-- Table: users
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password        VARCHAR(255)    NOT NULL,           -- bcrypt hashed
    phone           VARCHAR(20)     NOT NULL,
    role_id         INT             NOT NULL DEFAULT 3, -- default: customer
    address_line1   VARCHAR(255)    DEFAULT NULL,
    address_line2   VARCHAR(255)    DEFAULT NULL,
    city            VARCHAR(100)    DEFAULT NULL,
    district        VARCHAR(100)    DEFAULT NULL,
    pincode         VARCHAR(20)     DEFAULT NULL,
    country         VARCHAR(100)    DEFAULT NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ---------------------------------------------
-- Table: categories
-- ---------------------------------------------
DROP TABLE IF EXISTS categories;
CREATE TABLE IF NOT EXISTS categories (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    category_name   VARCHAR(100)    NOT NULL,
    parent_id       INT             DEFAULT NULL,
    level           INT             NOT NULL DEFAULT 1, -- 1: Parent, 2: Child, 3: Grandchild
    image_url       VARCHAR(255)    DEFAULT NULL,
    display_order   INT             DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
);


-- Seed categories
INSERT INTO categories (category_name, parent_id, level, display_order) VALUES ('Restaurants', NULL, 1, 1);
INSERT INTO categories (category_name, parent_id, level, display_order) VALUES ('Coffee & Tea', NULL, 1, 2);
INSERT INTO categories (category_name, parent_id, level, display_order) VALUES ('Fast Food', NULL, 1, 3);
INSERT INTO categories (category_name, parent_id, level, display_order) VALUES ('Italian', 1, 2, 1);
INSERT INTO categories (category_name, parent_id, level, display_order) VALUES ('Pizza', 4, 3, 1);
INSERT INTO categories (category_name, parent_id, level, display_order) VALUES ('Burgers', 3, 2, 1);

CREATE TABLE IF NOT EXISTS vendors (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    name                  VARCHAR(150) NOT NULL,
    latitude              DECIMAL(10, 8) DEFAULT NULL,
    longitude             DECIMAL(11, 8) DEFAULT NULL,
    service_radius_meters INT DEFAULT 5000,
    is_active             TINYINT(1) NOT NULL DEFAULT 1,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    description         TEXT DEFAULT NULL,
    category_id         INT DEFAULT NULL,
    vendor_id           INT DEFAULT NULL,
    city                VARCHAR(100) DEFAULT NULL,
    district            VARCHAR(100) DEFAULT NULL,
    thumbnail_url       VARCHAR(255) DEFAULT NULL,
    image_url           VARCHAR(255) DEFAULT NULL,
    price               DECIMAL(10,2) DEFAULT 0,
    discount_percentage INT DEFAULT 0,
    offer_label         VARCHAR(100) DEFAULT NULL,
    rating              DECIMAL(3,2) DEFAULT 0,
    review_count        INT DEFAULT 0,
    valid_until         DATETIME DEFAULT NULL,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    is_approved         TINYINT(1) NOT NULL DEFAULT 1,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_listings_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_listings_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS coupons (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(150) NOT NULL,
    subtitle         VARCHAR(255) DEFAULT NULL,
    banner_image_url VARCHAR(255) DEFAULT NULL,
    coupon_code      VARCHAR(100) DEFAULT NULL,
    vendor_id        INT DEFAULT NULL,
    city             VARCHAR(100) DEFAULT NULL,
    valid_from       DATETIME NOT NULL,
    valid_until      DATETIME NOT NULL,
    priority         INT DEFAULT 0,
    campaign_type    VARCHAR(50) DEFAULT 'coupon',
    is_active        TINYINT(1) NOT NULL DEFAULT 1,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_coupons_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS booking_history (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    listing_id   INT NOT NULL,
    user_id      INT NOT NULL,
    status       VARCHAR(50) DEFAULT 'confirmed',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_booking_listing FOREIGN KEY (listing_id) REFERENCES listings(id),
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS listing_views (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    listing_id  INT NOT NULL,
    user_id     INT DEFAULT NULL,
    viewed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_listing_views_listing FOREIGN KEY (listing_id) REFERENCES listings(id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    listing_id  INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_wishlist_listing FOREIGN KEY (listing_id) REFERENCES listings(id)
);
USE roameo;

CREATE TABLE IF NOT EXISTS reward_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    tier_level INT NOT NULL,
    min_earnings DECIMAL(10,2) DEFAULT 0.00,
    min_bookings INT DEFAULT 0,
    benefits JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP NULL,
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE vendors
ADD COLUMN email VARCHAR(255) DEFAULT NULL,
ADD COLUMN phone VARCHAR(20) DEFAULT NULL,
ADD COLUMN address VARCHAR(255) DEFAULT NULL,
ADD COLUMN business_description TEXT DEFAULT NULL,
ADD COLUMN reward_points INT DEFAULT 0,
ADD COLUMN tier_id INT DEFAULT NULL,
ADD FOREIGN KEY (tier_id) REFERENCES reward_tiers(id);
