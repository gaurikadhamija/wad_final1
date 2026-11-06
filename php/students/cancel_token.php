<?php
/**
 * QueueLess - Student Cancel Token Endpoint
 * File: php/students/cancel_token.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['student', 'admin', 'operator', 'provider']);
$userId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$tokenId = (int)($data['token_id'] ?? 0);
$reason  = trim($data['reason'] ?? 'User cancelled from student portal');

if ($tokenId <= 0) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Missing or invalid token ID.'
    ], 400);
}

try {
    $pdo->beginTransaction();

    // Verify ownership and waiting status
    $stmt = $pdo->prepare('SELECT id, queue_id, token_display, status FROM tokens WHERE id = :id AND user_id = :user_id FOR UPDATE');
    $stmt->execute([
        ':id'      => $tokenId,
        ':user_id' => $userId
    ]);
    $token = $stmt->fetch();

    if (!$token) {
        throw new Exception('Token not found or you do not have permission to cancel it.');
    }

    if ($token['status'] === 'completed') {
        throw new Exception('This token has already been served and completed.');
    }

    if ($token['status'] === 'cancelled') {
        throw new Exception('This token is already cancelled.');
    }

    // Update status to cancelled
    $updateStmt = $pdo->prepare('UPDATE tokens SET status = "cancelled" WHERE id = :id');
    $updateStmt->execute([':id' => $tokenId]);

    // Record audit event
    $eventStmt = $pdo->prepare('
        INSERT INTO queue_events (token_id, queue_id, event_type, actor_id, event_notes)
        VALUES (:token_id, :queue_id, "cancelled", :actor_id, :notes)
    ');
    $eventStmt->execute([
        ':token_id' => $tokenId,
        ':queue_id' => $token['queue_id'],
        ':actor_id' => $userId,
        ':notes'    => $reason
    ]);

    // Notification
    $notifStmt = $pdo->prepare('
        INSERT INTO notifications (user_id, token_id, message, type)
        VALUES (:user_id, :token_id, :message, "cancelled")
    ');
    $notifStmt->execute([
        ':user_id'  => $userId,
        ':token_id' => $tokenId,
        ':message'  => 'Your token ' . $token['token_display'] . ' has been cancelled.'
    ]);

    $pdo->commit();

    sendJSONResponse([
        'success' => true,
        'message' => 'Token ' . $token['token_display'] . ' has been successfully cancelled.'
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJSONResponse([
        'success' => false,
        'error'   => $e->getMessage()
    ], 400);
}
