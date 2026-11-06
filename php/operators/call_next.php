<?php
/**
 * QueueLess - Operator Call Next Token Endpoint
 * File: php/operators/call_next.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['operator', 'provider', 'admin']);
$actorId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$counterId = (int)($data['counter_id'] ?? 0);
if ($counterId <= 0) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Please specify a valid counter ID.'
    ], 400);
}

try {
    $pdo->beginTransaction();

    // 1. Fetch counter and assigned service
    $ctrStmt = $pdo->prepare('SELECT id, service_id, counter_number, counter_name, current_token_id, status FROM counters WHERE id = :id FOR UPDATE');
    $ctrStmt->execute([':id' => $counterId]);
    $counter = $ctrStmt->fetch();

    if (!$counter) {
        throw new Exception('Counter not found.');
    }

    $serviceId = (int)$counter['service_id'];

    // If counter is already serving an uncompleted token, auto-complete it or handle transition
    if ($counter['current_token_id']) {
        $prevTokenStmt = $pdo->prepare('UPDATE tokens SET status = "completed", completed_at = NOW() WHERE id = :id AND status = "serving"');
        $prevTokenStmt->execute([':id' => $counter['current_token_id']]);

        $evStmt = $pdo->prepare('INSERT INTO queue_events (token_id, queue_id, event_type, actor_id, event_notes) VALUES (:t_id, (SELECT queue_id FROM tokens WHERE id = :t_id2), "completed", :actor_id, "Completed before calling next token")');
        $evStmt->execute([
            ':t_id'     => $counter['current_token_id'],
            ':t_id2'    => $counter['current_token_id'],
            ':actor_id' => $actorId
        ]);
    }

    // 2. Select next waiting token for this service using atomic lock
    $nextTokenStmt = $pdo->prepare('
        SELECT t.id, t.queue_id, t.token_number, t.token_display, t.user_id, s.name AS service_name
        FROM tokens t
        JOIN services s ON t.service_id = s.id
        WHERE t.service_id = :service_id 
          AND t.status = "waiting"
        ORDER BY t.priority_level DESC, t.token_number ASC
        LIMIT 1
        FOR UPDATE
    ');
    $nextTokenStmt->execute([':service_id' => $serviceId]);
    $nextToken = $nextTokenStmt->fetch();

    if (!$nextToken) {
        // No tokens waiting: mark counter as idle
        $idleStmt = $pdo->prepare('UPDATE counters SET status = "idle", current_token_id = NULL WHERE id = :id');
        $idleStmt->execute([':id' => $counterId]);

        $pdo->commit();
        sendJSONResponse([
            'success'          => true,
            'has_next'         => false,
            'message'          => 'No students currently waiting in queue for this service.',
            'counter_status'   => 'idle'
        ]);
    }

    $tokenId = (int)$nextToken['id'];

    // 3. Transition token to 'serving'
    $updateToken = $pdo->prepare('
        UPDATE tokens 
        SET status = "serving", 
            counter_id = :counter_id, 
            called_at = NOW(), 
            position_in_queue = 0, 
            estimated_wait_minutes = 0 
        WHERE id = :id
    ');
    $updateToken->execute([
        ':counter_id' => $counterId,
        ':id'         => $tokenId
    ]);

    // 4. Update counter state
    $updateCounter = $pdo->prepare('
        UPDATE counters 
        SET status = "serving", 
            current_token_id = :token_id,
            operator_id = COALESCE(operator_id, :actor_id)
        WHERE id = :id
    ');
    $updateCounter->execute([
        ':token_id' => $tokenId,
        ':actor_id' => $actorId,
        ':id'       => $counterId
    ]);

    // 5. Update daily queue current serving number
    $updateQueue = $pdo->prepare('
        UPDATE queues 
        SET current_serving_number = :token_num 
        WHERE id = :q_id
    ');
    $updateQueue->execute([
        ':token_num' => $nextToken['token_number'],
        ':q_id'      => $nextToken['queue_id']
    ]);

    // 6. Record audit transition in queue_events
    $eventStmt = $pdo->prepare('
        INSERT INTO queue_events (token_id, queue_id, event_type, actor_id, event_notes)
        VALUES (:token_id, :queue_id, "called", :actor_id, :notes)
    ');
    $eventStmt->execute([
        ':token_id' => $tokenId,
        ':queue_id' => $nextToken['queue_id'],
        ':actor_id' => $actorId,
        ':notes'    => 'Called to ' . $counter['counter_name'] . ' (' . $counter['counter_number'] . ')'
    ]);

    // 7. Insert real-time notification for student
    $notifMsg = sprintf(
        'YOUR TURN! Please proceed to %s (%s) for your token %s.',
        $counter['counter_name'],
        $counter['counter_number'],
        $nextToken['token_display']
    );
    $notifStmt = $pdo->prepare('
        INSERT INTO notifications (user_id, token_id, message, type)
        VALUES (:user_id, :token_id, :message, "called")
    ');
    $notifStmt->execute([
        ':user_id'  => $nextToken['user_id'],
        ':token_id' => $tokenId,
        ':message'  => $notifMsg
    ]);

    $pdo->commit();

    sendJSONResponse([
        'success'       => true,
        'has_next'      => true,
        'message'       => 'Now serving ' . $nextToken['token_display'] . ' at ' . $counter['counter_number'],
        'token'         => [
            'id'            => $tokenId,
            'token_display' => $nextToken['token_display'],
            'service_name'  => $nextToken['service_name'],
            'counter_name'  => $counter['counter_name'],
            'counter_number'=> $counter['counter_number']
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJSONResponse([
        'success' => false,
        'error'   => 'Error calling next token: ' . $e->getMessage()
    ], 500);
}
