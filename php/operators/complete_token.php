<?php
/**
 * QueueLess - Operator Complete Service Token Endpoint
 * File: php/operators/complete_token.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['operator', 'provider', 'admin']);
$actorId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$counterId = (int)($data['counter_id'] ?? 0);
$tokenId   = (int)($data['token_id'] ?? 0);

if ($counterId <= 0 && $tokenId <= 0) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Please provide counter ID or token ID.'
    ], 400);
}

try {
    $pdo->beginTransaction();

    if ($counterId > 0 && $tokenId <= 0) {
        $ctrStmt = $pdo->prepare('SELECT current_token_id FROM counters WHERE id = :id FOR UPDATE');
        $ctrStmt->execute([':id' => $counterId]);
        $counter = $ctrStmt->fetch();
        $tokenId = (int)($counter['current_token_id'] ?? 0);
    }

    if ($tokenId <= 0) {
        throw new Exception('No active token is currently assigned to this counter.');
    }

    // Update token
    $tokenStmt = $pdo->prepare('
        UPDATE tokens 
        SET status = "completed", 
            completed_at = NOW() 
        WHERE id = :id
    ');
    $tokenStmt->execute([':id' => $tokenId]);

    // Fetch token details for logging
    $infoStmt = $pdo->prepare('SELECT queue_id, user_id, token_display, service_id FROM tokens WHERE id = :id');
    $infoStmt->execute([':id' => $tokenId]);
    $tokenInfo = $infoStmt->fetch();

    // Reset counter to idle
    if ($counterId > 0) {
        $resetCtr = $pdo->prepare('UPDATE counters SET status = "idle", current_token_id = NULL WHERE id = :id');
        $resetCtr->execute([':id' => $counterId]);
    }

    // Log event
    $evStmt = $pdo->prepare('
        INSERT INTO queue_events (token_id, queue_id, event_type, actor_id, event_notes)
        VALUES (:t_id, :q_id, "completed", :actor_id, "Service consultation completed successfully")
    ');
    $evStmt->execute([
        ':t_id'     => $tokenId,
        ':q_id'     => $tokenInfo['queue_id'],
        ':actor_id' => $actorId
    ]);

    // Notification to student
    $notifStmt = $pdo->prepare('
        INSERT INTO notifications (user_id, token_id, message, type)
        VALUES (:user_id, :token_id, :msg, "completed")
    ');
    $notifStmt->execute([
        ':user_id'  => $tokenInfo['user_id'],
        ':token_id' => $tokenId,
        ':msg'      => 'Your service for ' . $tokenInfo['token_display'] . ' is completed. Please rate your experience!'
    ]);

    $pdo->commit();

    sendJSONResponse([
        'success' => true,
        'message' => 'Token ' . $tokenInfo['token_display'] . ' marked as completed.',
        'token_id'=> $tokenId
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJSONResponse([
        'success' => false,
        'error'   => $e->getMessage()
    ], 500);
}
