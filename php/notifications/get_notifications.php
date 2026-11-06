<?php
/**
 * QueueLess - Get User Notifications Endpoint
 * File: php/notifications/get_notifications.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth();
$userId = $currentUser['id'];
$pdo = getDBConnection();

$stmt = $pdo->prepare('
    SELECT id, token_id, message, type, is_read, created_at 
    FROM notifications 
    WHERE user_id = :uid 
    ORDER BY id DESC 
    LIMIT 20
');
$stmt->execute([':uid' => $userId]);

sendJSONResponse([
    'success'       => true,
    'notifications' => $stmt->fetchAll()
]);
