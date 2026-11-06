<?php
/**
 * QueueLess - Admin Users Listing Endpoint
 * File: php/admin/get_users.php
 */
require_once __DIR__ . '/../config/database.php';

requireAuth(['admin']);
$pdo = getDBConnection();

$stmt = $pdo->query('
    SELECT id, full_name, email, role, phone, status, created_at
    FROM users
    ORDER BY id ASC
');

sendJSONResponse([
    'success' => true,
    'users'   => $stmt->fetchAll()
]);
