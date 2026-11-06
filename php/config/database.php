<?php
/**
 * QueueLess - Central Database & PDO Configuration
 * File: php/config/database.php
 * Designed for Apache/XAMPP with MySQL and PHP 7.4+ / 8.x
 */

// Strict error reporting for clean production/dev operation
error_reporting(E_ALL);
ini_set('display_errors', '0');

// ==========================================
// 1. DATABASE CREDENTIALS (XAMPP DEFAULTS)
// ==========================================
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'queueless_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_CHARSET', 'utf8mb4');

/**
 * Get or initialize the shared singleton PDO connection
 * @return PDO
 * @throws PDOException
 */
function getDBConnection() {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Send standardized error response if connection fails
            sendJSONResponse([
                'success' => false,
                'error'   => 'Database connection failed. Please ensure MySQL is running in XAMPP and queueless_db is imported.',
                'details' => $e->getMessage()
            ], 500);
            exit;
        }
    }

    return $pdo;
}

// ==========================================
// 2. SECURE SESSION MANAGEMENT
// ==========================================
function initSecureSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Enforce cookie security parameters
        session_set_cookie_params([
            'lifetime' => 86400, // 24 hours
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
}

// ==========================================
// 3. API JSON RESPONSE HELPER
// ==========================================
function sendJSONResponse($data, $statusCode = 200) {
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ==========================================
// 4. REQUEST BODY PARSER (JSON & POST)
// ==========================================
function getRequestData() {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $json = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($json)) {
            return array_merge($_POST, $json);
        }
    }
    return $_POST;
}

// ==========================================
// 5. SERVER-SIDE ROLE AUTHORIZATION
// ==========================================
function requireAuth($allowedRoles = []) {
    initSecureSession();

    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
        sendJSONResponse([
            'success' => false,
            'error'   => 'Unauthorized. Please sign in to access this feature.'
        ], 401);
    }

    if (!empty($allowedRoles) && !in_array($_SESSION['user_role'], $allowedRoles, true)) {
        sendJSONResponse([
            'success' => false,
            'error'   => 'Forbidden. Your role does not permit this action.'
        ], 403);
    }

    return [
        'id'        => $_SESSION['user_id'],
        'full_name' => $_SESSION['user_name'] ?? 'User',
        'email'     => $_SESSION['user_email'] ?? '',
        'role'      => $_SESSION['user_role']
    ];
}
