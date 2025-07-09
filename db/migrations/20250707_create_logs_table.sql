CREATE TABLE logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(128),
    FOREIGN KEY (user_id) REFERENCES users(firebase_uid)
);
