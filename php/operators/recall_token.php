<?php
/**
 * QueueLess - Operator Recall Token Endpoint
 * File: php/operators/recall_token.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['operator', 'provider', 'admin']);
$actorId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$tokenId = (int)($data['token_id'] ?? 0);
if ($tokenId <= 0) {
    sendJSONResponse(['success' => false, 'error' => 'Valid token ID required.'], 400);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('
        SELECT t.id, t.queue_id, t.user_id, t.token_display, c.counter_name, c.counter_number 
        FROM tokens t
        LEFT JOIN counters c ON t.counter_id = c.id
        WHERE t.id = :id
    ');
    $stmt->execute([':id' => $tokenId]);
    $token = $stmt->fetch();

    if (!$token) throw new Exception('Token not found.');

    // Log recall event
    $ev = $pdo->prepare('INSERT INTO queue_events (token_id, queue_id, event_type, actor_id, event_notes) VALUES (:t_id, :q_id, "recalled", :actor_id, "Audio & SMS recall broadcast dispatched")');
    $ev->execute([
        ':t_id'     => $tokenId,
        ':q_id'     => $token['queue_id'],
        ':actor_id' => $actorId
    ]);

    // Send high-priority notification
    $notif = $pdo->prepare('INSERT INTO notifications (user_id, token_id, message, type) VALUES (:user_id, :token_id, :msg, "called")');
    $notif->execute([
        ':user_id'  => $token['user_id'],
        ':token_id' => $tokenId,
        ':msg'      => 'FINAL CALL: Please report immediately to ' . ($token['counter_name'] ?: 'Counter') . ' for token ' . $token['token_display'] . '!'
    ]);

    $pdo->commit();

    sendJSONResponse([
        'success' => true,
        'message' => 'Recall alert and priority notification broadcasted for ' . $token['token_display'] . '.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    sendJSONResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
