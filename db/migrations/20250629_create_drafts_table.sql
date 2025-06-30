-- db/migrations/20250629_create_drafts_table.sql

-- Ensure we are using the correct database
USE shalom_db;

-- --- Table: drafts ---
-- This table will store draft posts and locations
CREATE TABLE IF NOT EXISTS drafts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    item_type ENUM('post', 'location') NOT NULL,
    content JSON NOT NULL, -- Will store all draft data (e.g., title, description, images, category_id, lat, lng, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE
);