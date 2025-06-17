-- db/migrations/20250617_initial_schema_refinement.sql

-- Ensure we are using the correct database
USE shalom_db;

-- --- Table: users ---
-- This table must exist before other tables try to reference it.
CREATE TABLE IF NOT EXISTS users (
    firebase_uid VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- Table: categories ---
-- Must be created before locations or posts if they reference it.
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    type ENUM('location', 'post') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- Table: locations ---
-- All columns are defined here initially. FK constraints will be added later.
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    description TEXT,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category_id INT, -- This column will be a FK to categories
    user_id VARCHAR(255), -- This column will be a FK to users
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0
);

-- --- Table: posts ---
-- References users, categories (NEW), and locations.
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    images JSON,
    user_id VARCHAR(255) NOT NULL,
    category_id INT, -- **ADDED THIS COLUMN**
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_id INT,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE, -- **ADDED THIS FOREIGN KEY**
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- --- Table: comments ---
-- References posts and users.
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_id VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- --- Table: favorites ---
-- References users.
CREATE TABLE IF NOT EXISTS favorites (
    user_id VARCHAR(255) NOT NULL,
    item_type ENUM('post', 'location') NOT NULL,
    item_id INT NOT NULL,
    PRIMARY KEY (user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- --- Table: votes ---
-- References users.
CREATE TABLE IF NOT EXISTS votes (
    user_id VARCHAR(255) NOT NULL,
    item_type ENUM('post', 'location') NOT NULL,
    item_id INT NOT NULL,
    value TINYINT,
    PRIMARY KEY (user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- --- Table: reports ---
-- References users.
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_type ENUM('post', 'location') NOT NULL,
    item_id INT NOT NULL,
    user_id VARCHAR(255),
    reason TEXT NOT NULL,
    status ENUM('open', 'closed', 'rejected') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE SET NULL ON UPDATE CASCADE
);

-- --- Add Foreign Key Constraints to locations table ---
-- These must run AFTER 'categories' and 'users' tables are guaranteed to exist.
-- If these were already added as part of the CREATE TABLE, you might get an error.
-- It's usually better to define them directly in CREATE TABLE if dependencies are clear,
-- or use ALTER TABLE *after* all tables are created in a migration script.
-- Given your previous structure, keeping them as ALTER TABLE here.
ALTER TABLE locations
ADD CONSTRAINT fk_location_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE locations
ADD CONSTRAINT fk_location_user
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional: Add some initial categories if needed for testing
INSERT INTO categories (name, type) VALUES
('Restaurant', 'location'),
('Synagogue', 'location'),
('Mikvah', 'location'),
('Community Event', 'post'),
('News', 'post')
ON DUPLICATE KEY UPDATE name=name; -- Prevents errors if these already exist