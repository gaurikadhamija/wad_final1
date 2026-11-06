<?php
/**
 * QueueLess - Mark Notifications Read Endpoint
 * File: php/notifications/mark_read.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth();
$userId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$notifId = (int)($data['notification_id'] ?? 0);

if ($notifId > 0) {
    $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid');
    $stmt->execute([':id' => $notifId, ':uid' => $userId]);
} else {
    // Mark all read for this user
    $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = :uid');
    $stmt->execute([':uid' => $userId]);
}

sendJSONResponse([
    'success' => true,
    'message' => 'Notifications updated.'
]);
