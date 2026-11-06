<?php
/**
 * QueueLess - Session Validation Endpoint
 * File: php/auth/check_session.php
 */
require_once __DIR__ . '/../config/database.php';

initSecureSession();

if (isset($_SESSION['user_id']) && isset($_SESSION['user_role'])) {
    sendJSONResponse([
        'authenticated' => true,
        'user'          => [
            'id'        => (int)$_SESSION['user_id'],
            'full_name' => $_SESSION['user_name'] ?? 'User',
            'email'     => $_SESSION['user_email'] ?? '',
            'role'      => $_SESSION['user_role']
        ]
    ]);
} else {
    sendJSONResponse([
        'authenticated' => false,
        'user'          => null
    ]);
}
