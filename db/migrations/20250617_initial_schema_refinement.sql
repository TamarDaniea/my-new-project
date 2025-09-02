USE shalom_db;

-- --- Table: users ---
CREATE TABLE IF NOT EXISTS users (
    firebase_uid VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- Table: categories ---
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    type ENUM('location', 'post') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- Table: locations ---
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    description TEXT,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category_id INT,
    user_id VARCHAR(255),
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0
);

-- --- Table: posts ---
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    images JSON,
    user_id VARCHAR(255) NOT NULL,
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_id INT,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- --- Table: comments ---
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    location_id INT,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- --- Table: favorites ---
CREATE TABLE IF NOT EXISTS favorites (
    user_id VARCHAR(255) NOT NULL,
    item_type ENUM('post', 'location') NOT NULL,
    item_id INT NOT NULL,
    PRIMARY KEY (user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- --- Table: votes ---
CREATE TABLE IF NOT EXISTS votes (
    user_id VARCHAR(255) NOT NULL,
    item_type ENUM('post', 'location') NOT NULL,
    item_id INT NOT NULL,
    value TINYINT NOT NULL,
    PRIMARY KEY (user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- --- Table: reports ---
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

-- --- Foreign Keys (only if not exists) ---
-- fk_location_category
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_NAME = 'fk_location_category' AND TABLE_NAME = 'locations' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE locations ADD CONSTRAINT fk_location_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE;',
    'SELECT "fk_location_category already exists";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- fk_location_user
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_NAME = 'fk_location_user' AND TABLE_NAME = 'locations' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE locations ADD CONSTRAINT fk_location_user FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE SET NULL ON UPDATE CASCADE;',
    'SELECT "fk_location_user already exists";'
);

-- ALTER TABLE categories MODIFY COLUMN name_he VARCHAR(255) DEFAULT NULL;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;



-- ALTER TABLE categories
-- ADD COLUMN name_he VARCHAR(255) DEFAULT NULL,
-- ADD COLUMN image_url VARCHAR(2083) DEFAULT NULL AFTER name_he;
-- הוספת name_he אם לא קיים
SET @col_name_he := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_he'
);
SET @sql_name_he := IF(@col_name_he = 0,
  'ALTER TABLE categories ADD COLUMN name_he VARCHAR(255) DEFAULT NULL;',
  'SELECT "column name_he already exists in categories";'
);
PREPARE stmt FROM @sql_name_he;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- הוספת image_url אם לא קיים
SET @col_image_url := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'image_url'
);
SET @sql_image_url := IF(@col_image_url = 0,
  'ALTER TABLE categories ADD COLUMN image_url VARCHAR(2083) DEFAULT NULL AFTER name_he;',
  'SELECT "column image_url already exists in categories";'
);
PREPARE stmt FROM @sql_image_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- --- Default categories for testing ---
INSERT INTO categories (name, type) VALUES
('Restaurant', 'location'),
('Synagogue', 'location'),
('Mikvah', 'location'),
('Community Event', 'post'),
('News', 'post')
ON DUPLICATE KEY UPDATE name = name;

-- --- Additional Columns ---
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255);
-- ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
-- ALTER TABLE locations ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT NULL;
-- ALTER TABLE locations ADD COLUMN IF NOT EXISTS area VARCHAR(255) DEFAULT NULL;
-- ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(255) DEFAULT NULL;
-- Add column 'city' to users only if it does not exist
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'city'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN city VARCHAR(255);',
  'SELECT "column city already exists in users";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add column 'is_deleted' to locations
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'locations' AND COLUMN_NAME = 'is_deleted'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE locations ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
  'SELECT "column is_deleted already exists in locations";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add column 'is_deleted' to posts
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'posts' AND COLUMN_NAME = 'is_deleted'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE posts ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;',
  'SELECT "column is_deleted already exists in posts";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add 'country' to locations
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'locations' AND COLUMN_NAME = 'country'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE locations ADD COLUMN country VARCHAR(255) DEFAULT NULL;',
  'SELECT "column country already exists in locations";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add 'area' to locations
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'locations' AND COLUMN_NAME = 'area'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE locations ADD COLUMN area VARCHAR(255) DEFAULT NULL;',
  'SELECT "column area already exists in locations";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add 'city' to locations
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'locations' AND COLUMN_NAME = 'city'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE locations ADD COLUMN city VARCHAR(255) DEFAULT NULL;',
  'SELECT "column city already exists in locations";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ALTER TABLE categories
-- ADD COLUMN name_he VARCHAR(255) DEFAULT NULL AFTER name,
-- ADD COLUMN image_url VARCHAR(2083) DEFAULT NULL AFTER name_he;



-- ALTER TABLE posts
-- ADD COLUMN view_count INT DEFAULT 0 AFTER comment_count;
-- ALTER TABLE locations
-- ADD COLUMN view_count INT DEFAULT 0 AFTER comment_count;
-- הוספת עמודת view_count ל-posts אם לא קיימת
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'posts' AND COLUMN_NAME = 'view_count'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE posts ADD COLUMN view_count INT DEFAULT 0 AFTER comment_count;',
  'SELECT "column view_count already exists in posts";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- הוספת עמודת view_count ל-locations אם לא קיימת
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'locations' AND COLUMN_NAME = 'view_count'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE locations ADD COLUMN view_count INT DEFAULT 0 AFTER comment_count;',
  'SELECT "column view_count already exists in locations";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_NAME = 'comments' AND COLUMN_NAME = 'parent_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE comments ADD COLUMN parent_id INT DEFAULT NULL AFTER location_id;',
  'SELECT "parent_id already exists";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


ALTER TABLE reports 
ADD COLUMN category_id INT,
ADD CONSTRAINT fk_reports_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS report_reasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reason_key VARCHAR(50) NOT NULL UNIQUE,
    description_he VARCHAR(255) NOT NULL
);

INSERT INTO report_reasons (reason_key, description_he) VALUES
('offensive_content', 'תוכן פוגעני או מעליב'),
('hate_speech', 'דברי שנאה או הסתה'),
('misleading_info', 'מידע שגוי או מטעה'),
('inappropriate_content', 'תוכן לא ראוי/בלתי הולם'),
('incorrect_location', 'מיקום שגוי או לא קיים'),
('duplicate_spam', 'תוכן כפול או ספאם'),
('privacy_violation', 'פגיעה בפרטיות או מידע רגיש'),
('irrelevant_fake_images', 'תמונות לא רלוונטיות / מזויפות'),
('unauthorized_commercial', 'פרסום מסחרי לא מורשה'),
('other', 'אחר (פרט)');


-- ALTER TABLE users
-- ADD COLUMN password VARCHAR(255) NOT NULL;
ALTER TABLE users DROP COLUMN password;

ALTER TABLE drafts
ADD COLUMN images JSON;