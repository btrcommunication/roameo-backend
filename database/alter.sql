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
