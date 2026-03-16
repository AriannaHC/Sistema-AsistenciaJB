-- ============================================================
-- SISTEMA DE ASISTENCIA JB - BASE DE DATOS
-- Compatible con MySQL 5.7+ (Hostinger)
-- ============================================================

CREATE DATABASE IF NOT EXISTS asistencia_jb 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE asistencia_jb;

-- ------------------------------------------------------------
-- TABLA: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  name          VARCHAR(150)  NOT NULL,
  email         VARCHAR(100)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  avatar        VARCHAR(500)  DEFAULT NULL,
  area          VARCHAR(100)  NOT NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- TABLA: attendance_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  user_name   VARCHAR(150)  NOT NULL,
  date        DATE          NOT NULL,
  check_in    DATETIME      NOT NULL,
  check_out   DATETIME      DEFAULT NULL,
  status      ENUM('Presente','Tardanza','Falta') NOT NULL DEFAULT 'Presente',
  location    VARCHAR(255)  DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, date),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- TABLA: sessions (JWT tokens activos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  token       VARCHAR(500)  NOT NULL UNIQUE,
  expires_at  DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token(255)),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- DATOS INICIALES - Admin por defecto
-- password: admin1 (hash bcrypt)
-- ------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, avatar, area, status)
VALUES (
  'u-admin-jb-001',
  'Administrador JB',
  'admin1',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminJB',
  'PLANEAMIENTO ESTRATÉGICO',
  'active'
) ON DUPLICATE KEY UPDATE name = name;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
