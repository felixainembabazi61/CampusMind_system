CREATE DATABASE IF NOT EXISTS campusmind
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campusmind;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','counselor','peer_mentor','administrator') NOT NULL DEFAULT 'student',
  department VARCHAR(120) NULL,
  student_number VARCHAR(60) NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_active (role, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  counselor_id BIGINT UNSIGNED NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  session_mode ENUM('in_person','online') NOT NULL DEFAULT 'in_person',
  reason_category VARCHAR(80) NOT NULL,
  student_note VARCHAR(1000) NULL,
  status ENUM('pending','approved','declined','cancelled','completed') NOT NULL DEFAULT 'pending',
  counselor_response VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_appointments_counselor FOREIGN KEY (counselor_id) REFERENCES users(id),
  INDEX idx_appointments_student (student_id, appointment_date),
  INDEX idx_appointments_counselor (counselor_id, appointment_date),
  INDEX idx_appointments_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS intake_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  assigned_counselor_id BIGINT UNSIGNED NULL,
  topic VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  priority ENUM('normal','timely') NOT NULL DEFAULT 'normal',
  status ENUM('submitted','under_review','referred','closed') NOT NULL DEFAULT 'submitted',
  staff_response TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_intakes_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_intakes_counselor FOREIGN KEY (assigned_counselor_id) REFERENCES users(id),
  INDEX idx_intakes_student (student_id),
  INDEX idx_intakes_assigned (assigned_counselor_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS peer_stories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('pending','published','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stories_author FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_stories_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS forum_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('published','hidden') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_posts_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS forum_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  body VARCHAR(2000) NOT NULL,
  status ENUM('published','hidden') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_comments_post (post_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  counselor_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversation_pair (student_id, counselor_id),
  CONSTRAINT fk_conversations_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_conversations_counselor FOREIGN KEY (counselor_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  body VARCHAR(4000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  INDEX idx_messages_conversation (conversation_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_actor_date (actor_id, created_at)
) ENGINE=InnoDB;
