<?php
/**
 * QueueLess - Admin Update User Status Endpoint
 * File: php/admin/update_user_status.php
 */
require_once __DIR__ . '/../config/database.php';

$adminUser = requireAuth(['admin']);
$pdo = getDBConnection();
$data = getRequestData();

$userId = (int)($data['user_id'] ?? 0);
$status = trim($data['status'] ?? 'active');

if ($userId <= 0 || !in_array($status, ['active', 'inactive', 'suspended'], true)) {
    sendJSONResponse(['success' => false, 'error' => 'Invalid user ID or status specified.'], 400);
}

// Cannot suspend self
if ($userId === $adminUser['id']) {
    sendJSONResponse(['success' => false, 'error' => 'You cannot modify your own administrator status.'], 403);
}

$stmt = $pdo->prepare('UPDATE users SET status = :status WHERE id = :id');
$stmt->execute([':status' => $status, ':id' => $userId]);

sendJSONResponse([
    'success' => true,
    'message' => 'User status successfully updated to ' . $status . '.'
]);
