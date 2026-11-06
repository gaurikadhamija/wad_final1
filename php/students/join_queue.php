<?php
/**
 * QueueLess - Server-Side Atomic Queue Join & Token Issuance
 * File: php/students/join_queue.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['student', 'admin', 'operator', 'provider']);
$userId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$serviceId = (int)($data['service_id'] ?? 0);
if ($serviceId <= 0) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Invalid service specified.'
    ], 400);
}

// Check if student already has an active waiting/serving token for this service
$checkActive = $pdo->prepare('
    SELECT t.id, t.token_display, s.name AS service_name
    FROM tokens t
    JOIN services s ON t.service_id = s.id
    WHERE t.user_id = :user_id 
      AND t.service_id = :service_id 
      AND t.status IN ("waiting", "serving")
    LIMIT 1
');
$checkActive->execute([
    ':user_id'    => $userId,
    ':service_id' => $serviceId
]);
$existing = $checkActive->fetch();

if ($existing) {
    sendJSONResponse([
        'success'       => false,
        'error'         => 'You already have an active ticket (' . $existing['token_display'] . ') for ' . $existing['service_name'] . '.',
        'existing_token'=> $existing
    ], 409);
}

try {
    $pdo->beginTransaction();

    // 1. Fetch service details and check active status
    $svcStmt = $pdo->prepare('SELECT id, name, prefix, estimated_handling_time, is_active FROM services WHERE id = :id FOR UPDATE');
    $svcStmt->execute([':id' => $serviceId]);
    $service = $svcStmt->fetch();

    if (!$service || !(int)$service['is_active']) {
        throw new Exception('The selected service is currently offline or inactive.');
    }

    $today = date('Y-m-d');

    // 2. Lock or create today\'s queue record for this service
    $queueStmt = $pdo->prepare('SELECT id, status, total_tokens_issued FROM queues WHERE service_id = :service_id AND queue_date = :today FOR UPDATE');
    $queueStmt->execute([
        ':service_id' => $serviceId,
        ':today'      => $today
    ]);
    $queue = $queueStmt->fetch();

    if (!$queue) {
        $createQueue = $pdo->prepare('INSERT INTO queues (service_id, queue_date, status, total_tokens_issued, current_serving_number) VALUES (:service_id, :today, "open", 0, 0)');
        $createQueue->execute([
            ':service_id' => $serviceId,
            ':today'      => $today
        ]);
        $queueId = (int)$pdo->lastInsertId();
        $totalIssued = 0;
        $queueStatus = 'open';
    } else {
        $queueId = (int)$queue['id'];
        $totalIssued = (int)$queue['total_tokens_issued'];
        $queueStatus = $queue['status'];
    }

    if ($queueStatus === 'closed') {
        throw new Exception('Queue registration is currently closed for today.');
    }

    // 3. Atomically advance sequential token number
    $nextTokenNumber = $totalIssued + 1;
    $tokenDisplay = sprintf('%s-%03d', $service['prefix'], $nextTokenNumber);

    // Update queue total issued
    $updateQueue = $pdo->prepare('UPDATE queues SET total_tokens_issued = :num WHERE id = :id');
    $updateQueue->execute([
        ':num' => $nextTokenNumber,
        ':id'  => $queueId
    ]);

    // 4. Calculate actual queue position ahead & realistic wait time
    $posStmt = $pdo->prepare('SELECT COUNT(*) AS waiting_ahead FROM tokens WHERE queue_id = :queue_id AND status = "waiting"');
    $posStmt->execute([':queue_id' => $queueId]);
    $waitingAhead = (int)($posStmt->fetch()['waiting_ahead'] ?? 0);

    // Count active counters for this service
    $ctrStmt = $pdo->prepare('SELECT COUNT(*) AS active_ctrs FROM counters WHERE service_id = :service_id AND status != "offline"');
    $ctrStmt->execute([':service_id' => $serviceId]);
    $activeCounters = max(1, (int)($ctrStmt->fetch()['active_ctrs'] ?? 1));

    $estimatedWait = (int)ceil(($waitingAhead * (int)$service['estimated_handling_time']) / $activeCounters);

    // 5. Insert new token
    $insertToken = $pdo->prepare('
        INSERT INTO tokens (
            queue_id, service_id, user_id, token_number, token_display,
            status, position_in_queue, estimated_wait_minutes, created_at
        ) VALUES (
            :queue_id, :service_id, :user_id, :token_number, :token_display,
            "waiting", :position, :wait_time, NOW()
        )
    ');
    $insertToken->execute([
        ':queue_id'      => $queueId,
        ':service_id'    => $serviceId,
        ':user_id'       => $userId,
        ':token_number'  => $nextTokenNumber,
        ':token_display' => $tokenDisplay,
        ':position'      => $waitingAhead + 1,
        ':wait_time'     => $estimatedWait
    ]);
    $tokenId = (int)$pdo->lastInsertId();

    // 6. Record audit transition in queue_events
    $eventStmt = $pdo->prepare('
        INSERT INTO queue_events (token_id, queue_id, event_type, actor_id, event_notes)
        VALUES (:token_id, :queue_id, "issued", :actor_id, "Virtual token generated via Student Portal")
    ');
    $eventStmt->execute([
        ':token_id' => $tokenId,
        ':queue_id' => $queueId,
        ':actor_id' => $userId
    ]);

    // 7. Insert notification
    $notifMsg = sprintf(
        'Your boarding pass %s for %s is confirmed. %d people ahead of you (~%d mins wait).',
        $tokenDisplay,
        $service['name'],
        $waitingAhead,
        $estimatedWait
    );
    $notifStmt = $pdo->prepare('
        INSERT INTO notifications (user_id, token_id, message, type)
        VALUES (:user_id, :token_id, :message, "info")
    ');
    $notifStmt->execute([
        ':user_id'  => $userId,
        ':token_id' => $tokenId,
        ':message'  => $notifMsg
    ]);

    $pdo->commit();

    sendJSONResponse([
        'success' => true,
        'message' => 'Token issued successfully!',
        'token'   => [
            'id'                     => $tokenId,
            'token_display'          => $tokenDisplay,
            'service_name'           => $service['name'],
            'position_ahead'         => $waitingAhead,
            'estimated_wait_minutes' => $estimatedWait,
            'status'                 => 'waiting',
            'created_at'             => date('Y-m-d H:i:s')
        ]
    ], 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJSONResponse([
        'success' => false,
        'error'   => $e->getMessage()
    ], 500);
}
