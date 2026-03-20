-- ============================================================
-- SISTEMA DE ASISTENCIA Y GESTIÓN JB - BASE DE DATOS INICIAL
-- Compatible con MySQL 5.7+ / MariaDB (Hostinger, XAMPP)
-- ============================================================

-- 1. LIMPIEZA Y CREACIÓN DE BASE DE DATOS
DROP DATABASE IF EXISTS asistencia_jb;
CREATE DATABASE asistencia_jb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE asistencia_jb;

-- ------------------------------------------------------------
-- TABLA: schedules (Horarios)
-- ------------------------------------------------------------
CREATE TABLE `schedules` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `type` enum('simple','bloques') NOT NULL DEFAULT 'simple',
  `time_in` time DEFAULT NULL,
  `time_out` time DEFAULT NULL,
  `tolerance_minutes` int(11) NOT NULL DEFAULT 10,
  `blocks` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLA: users (Usuarios)
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `name` varchar(150) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','employee') NOT NULL DEFAULT 'employee',
  `avatar` varchar(500) DEFAULT NULL,
  `area` varchar(100) NOT NULL,
  `lunch_limit` varchar(5) DEFAULT '13:00',
  `lunch_start_time` varchar(5) DEFAULT '12:00',
  `schedule_id` varchar(36) DEFAULT 'default-schedule-id',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLA: attendance_records (Registro de Asistencias)
-- ------------------------------------------------------------
CREATE TABLE `attendance_records` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `user_id` varchar(36) NOT NULL,
  `user_name` varchar(150) NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime NOT NULL,
  `check_out` datetime DEFAULT NULL,
  `lunch_start` datetime DEFAULT NULL,
  `lunch_end` datetime DEFAULT NULL,
  `lunch_limit` varchar(5) DEFAULT NULL,
  `lunch_start_time` varchar(5) DEFAULT NULL,
  `status` enum('Presente','Tardanza','Falta') NOT NULL DEFAULT 'Presente',
  `location` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  CONSTRAINT `fk_attendance_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_user_date` (`user_id`,`date`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLA: sessions (Tokens JWT)
-- ------------------------------------------------------------
CREATE TABLE `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` varchar(36) NOT NULL,
  `token` varchar(500) NOT NULL UNIQUE,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_token` (`token`(255)),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLA: convenios (Beneficios Corporativos)
-- ------------------------------------------------------------
CREATE TABLE `convenios` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `nombre` varchar(150) NOT NULL,
  `empresa` varchar(150) NOT NULL,
  `categoria` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `beneficios` text DEFAULT NULL,
  `quienes` text DEFAULT NULL,
  `como_acceder` text DEFAULT NULL,
  `vigencia` varchar(200) DEFAULT NULL,
  `contacto` varchar(300) DEFAULT NULL,
  `descuento` varchar(50) DEFAULT NULL,
  `imagen_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLA: notifications (Módulo de Comunicados)
-- ------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `title` varchar(200) NOT NULL,
  `body` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `pdf_url` varchar(500) DEFAULT NULL,
  `audience` enum('all','area','user') NOT NULL DEFAULT 'all',
  `audience_value` varchar(150) DEFAULT NULL,
  `created_by` varchar(36) NOT NULL,
  `idempotency_key` varchar(64) DEFAULT NULL UNIQUE,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  INDEX `idx_audience` (`audience`, `audience_value`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLA: notification_reads (Rastreo de lecturas)
-- ------------------------------------------------------------
CREATE TABLE `notification_reads` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `notification_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `read_at` datetime NOT NULL DEFAULT current_timestamp(),
  UNIQUE KEY `uq_user_notification` (`notification_id`, `user_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- DATOS INICIALES (SEMILLA)
-- ============================================================

-- 1. Insertar Horario Base
INSERT INTO `schedules` (`id`, `name`, `type`, `time_in`, `time_out`, `tolerance_minutes`, `blocks`) VALUES
('SCH-6CE59E', 'Horario Base', 'simple', '10:00:00', '16:00:00', 10, NULL);

-- 2. Insertar Administrador Principal (Pass: Admin$$123)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar`, `area`, `lunch_limit`, `lunch_start_time`, `schedule_id`, `status`) VALUES
('78f609fb-568f-46bd-b6b9-4f4c4ce21fb9', 'Administrador JB', 'admin@jb.com', '$2y$12$uJ5ZWBV1OYPr3ihbkRIRQef4rBTjNqOwIseGskfs6vYtKoqN06cBu', 'admin', 'https://cdn-icons-png.flaticon.com/512/149/149071.png', 'SECRETARÍA DE GERENCIA', '13:00', '12:00', 'SCH-6CE59E', 'active');

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================