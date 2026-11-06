<?php
/**
 * QueueLess - Operator Mark No-Show Endpoint
 * File: php/operators/mark_no_show.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['operator', 'provider', 'admin']);
$actorId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$counterId = (int)($data['counter_id'] ?? 0);
$tokenId   = (int)($data['token_id'] ?? 0);

if ($tokenId <= 0 && $counterId > 0) {
    $ctr = $pdo->prepare('SELECT current_token_id FROM counters WHERE id = :id');
    $ctr->execute([':id' => $counterId]);
    $tokenId = (int)($ctr->fetch()['current_token_id'] ?? 0);
}

if ($tokenId <= 0) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Token ID required.'
    ], 400);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT queue_id, user_id, token_display FROM tokens WHERE id = :id FOR UPDATE');
    $stmt->execute([':id' => $tokenId]);
    $token = $stmt->fetch();

    if (!$token) throw new Exception('Token not found.');

    // Update token status
    $updateStmt = $pdo->prepare('UPDATE tokens SET status = "no_show" WHERE id = :id');
    $updateStmt->execute([':id' => $tokenId]);

    // Free counter
    if ($counterId > 0) {
        $freeCtr = $pdo->prepare('UPDATE counters SET status = "idle", current_token_id = NULL WHERE id = :id');
        $freeCtr->execute([':id' => $counterId]);
    }

    // Log event
    $ev = $pdo->prepare('INSERT INTO queue_events (token_id, queue_id, event_type, actor_id, event_notes) VALUES (:t_id, :q_id, "no_show", :actor_id, "Student did not report to counter after calls")');
    $ev->execute([
        ':t_id'     => $tokenId,
        ':q_id'     => $token['queue_id'],
        ':actor_id' => $actorId
    ]);

    $pdo->commit();

    sendJSONResponse([
        'success' => true,
        'message' => 'Token ' . $token['token_display'] . ' marked as no-show.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    sendJSONResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
