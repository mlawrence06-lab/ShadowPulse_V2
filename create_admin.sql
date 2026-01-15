CREATE USER IF NOT EXISTS 'shadowpulse_admin'@'localhost' IDENTIFIED BY 'pulse_secure_admin';
GRANT ALL PRIVILEGES ON shadowpulse_v2.* TO 'shadowpulse_admin'@'localhost';
FLUSH PRIVILEGES;
