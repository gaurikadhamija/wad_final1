-- ============================================================================
-- QueueLess Database Schema
-- File: database/queueless_db.sql
-- Target Engine: MySQL 5.7+ / 8.0+ / MariaDB (XAMPP Default)
-- Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `queueless_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `queueless_db`;

-- Disable Foreign Key checks during initialization
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Table: users
-- Stores all system actors: students, providers, administrators, and desk operators
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'provider', 'admin', 'operator') NOT NULL DEFAULT 'student',
  `phone` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: providers
-- Campus organizations, departments, or centers providing virtual queue services
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `providers`;
CREATE TABLE `providers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `organization_name` VARCHAR(150) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `campus_location` VARCHAR(150) NOT NULL,
  `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `approved_by` INT UNSIGNED DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_provider_approval` (`approval_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: services
-- Individual service lines provided by campus centers (e.g., Dean Office, Fee Desk)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `provider_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` ENUM('Administration', 'Academic', 'Financial', 'Library', 'Dining', 'Health', 'Student Affairs') NOT NULL DEFAULT 'Administration',
  `prefix` VARCHAR(6) NOT NULL DEFAULT 'QL',
  `estimated_handling_time` INT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Estimated minutes per token',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE CASCADE,
  INDEX `idx_services_category` (`category`),
  INDEX `idx_services_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table: operating_hours
-- Scheduled weekly hours for each service
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `operating_hours`;
CREATE TABLE `operating_hours` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `service_id` INT UNSIGNED NOT NULL,
  `day_of_week` TINYINT UNSIGNED NOT NULL COMMENT '1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun',
  `open_time` TIME NOT NULL,
  `close_time` TIME NOT NULL,
  `is_closed` TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_service_day` (`service_id`, `day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table: queues
-- Daily queue instances for services
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `queues`;
CREATE TABLE `queues` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `service_id` INT UNSIGNED NOT NULL,
  `queue_date` DATE NOT NULL,
  `status` ENUM('open', 'paused', 'closed') NOT NULL DEFAULT 'open',
  `total_tokens_issued` INT UNSIGNED NOT NULL DEFAULT 0,
  `current_serving_number` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_service_date` (`service_id`, `queue_date`),
  INDEX `idx_queue_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Table: counters
-- Physical or virtual desks operating within a service provider
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `counters`;
CREATE TABLE `counters` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `provider_id` INT UNSIGNED NOT NULL,
  `service_id` INT UNSIGNED NOT NULL,
  `counter_number` VARCHAR(10) NOT NULL,
  `counter_name` VARCHAR(100) NOT NULL,
  `operator_id` INT UNSIGNED DEFAULT NULL,
  `status` ENUM('idle', 'serving', 'paused', 'offline') NOT NULL DEFAULT 'idle',
  `current_token_id` INT UNSIGNED DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_counter_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Table: tokens
-- Virtual boarding passes issued to students for queue lines
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `tokens`;
CREATE TABLE `tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `queue_id` INT UNSIGNED NOT NULL,
  `service_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `token_number` INT UNSIGNED NOT NULL,
  `token_display` VARCHAR(20) NOT NULL,
  `status` ENUM('waiting', 'serving', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'waiting',
  `counter_id` INT UNSIGNED DEFAULT NULL,
  `position_in_queue` INT UNSIGNED DEFAULT 1,
  `estimated_wait_minutes` INT UNSIGNED DEFAULT 0,
  `priority_level` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `called_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`counter_id`) REFERENCES `counters`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `uk_queue_token_num` (`queue_id`, `token_number`),
  INDEX `idx_token_status` (`status`),
  INDEX `idx_token_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Table: queue_events
-- Audit trail tracking state transitions for every token and queue action
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `queue_events`;
CREATE TABLE `queue_events` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `token_id` INT UNSIGNED NOT NULL,
  `queue_id` INT UNSIGNED NOT NULL,
  `event_type` ENUM('issued', 'called', 'started_serving', 'completed', 'cancelled', 'skipped', 'recalled', 'no_show') NOT NULL,
  `actor_id` INT UNSIGNED DEFAULT NULL,
  `event_timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `event_notes` TEXT DEFAULT NULL,
  FOREIGN KEY (`token_id`) REFERENCES `tokens`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_event_token` (`token_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Table: notifications
-- Real-time in-app alerts and turn progression messages for students
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `token_id` INT UNSIGNED DEFAULT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'turn_approaching', 'called', 'completed', 'cancelled') NOT NULL DEFAULT 'info',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`token_id`) REFERENCES `tokens`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Table: feedback
-- Post-service student ratings and feedback
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `feedback`;
CREATE TABLE `feedback` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `token_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `service_id` INT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comments` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`token_id`) REFERENCES `tokens`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_token_feedback` (`token_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable Foreign Key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA FOR DEMONSTRATION & TESTING
-- All user passwords default to: password123
-- ============================================================================

-- Default Users
INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role`, `phone`, `status`) VALUES
(1, 'System Administrator', 'admin@queueless.edu', '$2y$10$wN9aV/3j/lM/6cK3iQ9QXeM8VfT.6Y0QzE/n3N4U5r8gN9lP6m6/C', 'admin', '+91 98765 00001', 'active'),
(2, 'West Campus Administration', 'provider@campus.edu', '$2y$10$wN9aV/3j/lM/6cK3iQ9QXeM8VfT.6Y0QzE/n3N4U5r8gN9lP6m6/C', 'provider', '+91 98765 00002', 'active'),
(3, 'Alex Morgan', 'student@igdtuw.ac.in', '$2y$10$wN9aV/3j/lM/6cK3iQ9QXeM8VfT.6Y0QzE/n3N4U5r8gN9lP6m6/C', 'student', '+91 98765 00003', 'active'),
(4, 'Dr. Sarah Vance', 'sarah.vance@campus.edu', '$2y$10$wN9aV/3j/lM/6cK3iQ9QXeM8VfT.6Y0QzE/n3N4U5r8gN9lP6m6/C', 'operator', '+91 98765 00004', 'active'),
(5, 'Officer Mark Ramos', 'mark.ramos@campus.edu', '$2y$10$wN9aV/3j/lM/6cK3iQ9QXeM8VfT.6Y0QzE/n3N4U5r8gN9lP6m6/C', 'operator', '+91 98765 00005', 'active');

-- Default Approved Provider
INSERT INTO `providers` (`id`, `user_id`, `organization_name`, `department`, `campus_location`, `approval_status`, `approved_by`, `approved_at`) VALUES
(1, 2, 'West Campus Student Service Center', 'Student Services & Academic Affairs', 'Room 104, West Wing Admin Block', 'approved', 1, NOW());

-- Default Services
INSERT INTO `services` (`id`, `provider_id`, `name`, `category`, `prefix`, `estimated_handling_time`, `is_active`, `description`) VALUES
(1, 1, 'College Administration Office', 'Administration', 'QL', 12, 1, 'Dean Office attestations, enrollment letters, and administrative certificates.'),
(2, 1, 'Admissions & Transfers Desk', 'Academic', 'ADM', 10, 1, 'Branch transfers, document verification, and academic admissions.'),
(3, 1, 'Scholarships & Financial Aid', 'Financial', 'SCH', 15, 1, 'Tuition fee concessions, government stipends, and merit scholarship disbursals.'),
(4, 1, 'Library Help Desk', 'Library', 'LIB', 5, 1, 'Book issuance, membership renewals, thesis archive access, and study room tokens.'),
(5, 1, 'Campus Cafeteria Express', 'Dining', 'CAF', 4, 1, 'Meal vouchers, lunch token collection, and express food counter pickup.'),
(6, 1, 'Medical Centre & Clinic', 'Health', 'MED', 8, 1, 'First-aid consultations, doctor appointments, and prescription refills.');

-- Default Operating Hours for Services (Mon - Fri: 09:00 - 17:00, Sat: 09:00 - 13:00, Sun: Closed)
INSERT INTO `operating_hours` (`service_id`, `day_of_week`, `open_time`, `close_time`, `is_closed`) VALUES
(1, 1, '09:00:00', '17:00:00', 0),
(1, 2, '09:00:00', '17:00:00', 0),
(1, 3, '09:00:00', '17:00:00', 0),
(1, 4, '09:00:00', '17:00:00', 0),
(1, 5, '09:00:00', '17:00:00', 0),
(1, 6, '09:00:00', '13:00:00', 0),
(1, 7, '00:00:00', '00:00:00', 1);

-- Default Counters
INSERT INTO `counters` (`id`, `provider_id`, `service_id`, `counter_number`, `counter_name`, `operator_id`, `status`) VALUES
(1, 1, 2, 'Counter 01', 'Admissions & Transfers Window', 5, 'serving'),
(2, 1, 1, 'Counter 02', 'Administration (Dean Office)', 4, 'serving'),
(3, 1, 3, 'Counter 03', 'Scholarships & Aid Desk', NULL, 'idle');

-- Default Today's Queues
INSERT INTO `queues` (`id`, `service_id`, `queue_date`, `status`, `total_tokens_issued`, `current_serving_number`) VALUES
(1, 1, CURRENT_DATE(), 'open', 104, 101),
(2, 2, CURRENT_DATE(), 'open', 88, 87),
(3, 3, CURRENT_DATE(), 'open', 40, 40);

-- Default Active Tokens
INSERT INTO `tokens` (`id`, `queue_id`, `service_id`, `user_id`, `token_number`, `token_display`, `status`, `counter_id`, `position_in_queue`, `estimated_wait_minutes`, `created_at`) VALUES
(1, 1, 1, 3, 104, 'QL-104', 'waiting', 2, 3, 14, NOW()),
(2, 2, 2, 3, 88, 'ADM-088', 'serving', 1, 0, 0, NOW());

-- Audit Events
INSERT INTO `queue_events` (`token_id`, `queue_id`, `event_type`, `actor_id`, `event_notes`) VALUES
(1, 1, 'issued', 3, 'Virtual token booked via Student Portal'),
(2, 2, 'issued', 3, 'Virtual token booked via Student Portal'),
(2, 2, 'called', 5, 'Called to Counter 01 by Officer Mark Ramos');

-- Default Notification
INSERT INTO `notifications` (`user_id`, `token_id`, `message`, `type`, `is_read`) VALUES
(3, 1, 'Your token QL-104 for College Administration Office is confirmed. 3 students ahead.', 'info', 0);
