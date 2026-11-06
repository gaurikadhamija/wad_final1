<?php
/**
 * QueueLess - Sign Out Endpoint
 * File: php/auth/logout.php
 */
require_once __DIR__ . '/../config/database.php';

initSecureSession();

// Clear and destroy session
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}
session_destroy();

sendJSONResponse([
    'success' => true,
    'message' => 'Signed out successfully.'
]);
