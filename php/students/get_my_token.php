<?php
/**
 * QueueLess - Get Student Active Token Endpoint
 * File: php/students/get_my_token.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['student', 'admin', 'operator', 'provider']);
$userId = $currentUser['id'];
$pdo = getDBConnection();

// Fetch latest active token for this user
$query = "
    SELECT 
        t.id,
        t.token_number,
        t.token_display,
        t.status,
        t.created_at,
        t.called_at,
        s.id AS service_id,
        s.name AS service_name,
        s.category AS service_category,
        s.estimated_handling_time,
        p.organization_name,
        p.campus_location,
        c.counter_number,
        c.counter_name,
        u_op.full_name AS operator_name
    FROM tokens t
    JOIN services s ON t.service_id = s.id
    JOIN providers p ON s.provider_id = p.id
    LEFT JOIN counters c ON t.counter_id = c.id
    LEFT JOIN users u_op ON c.operator_id = u_op.id
    WHERE t.user_id = :user_id 
      AND t.status IN ('waiting', 'serving')
    ORDER BY t.id DESC
    LIMIT 1
";

$stmt = $pdo->prepare($query);
$stmt->execute([':user_id' => $userId]);
$token = $stmt->fetch();

if (!$token) {
    sendJSONResponse([
        'success'      => true,
        'has_token'    => false,
        'active_token' => null
    ]);
}

// Calculate real-time position ahead (tokens in same service/queue still waiting with smaller token_number)
$posStmt = $pdo->prepare('
    SELECT COUNT(*) AS ahead_count 
    FROM tokens 
    WHERE service_id = :service_id 
      AND status = "waiting" 
      AND token_number < :token_number
');
$posStmt->execute([
    ':service_id'    => $token['service_id'],
    ':token_number' => $token['token_number']
]);
$peopleAhead = (int)($posStmt->fetch()['ahead_count'] ?? 0);

// Calculate remaining estimated wait time
$handlingTime = (int)$token['estimated_handling_time'];
$estimatedWait = $token['status'] === 'serving' ? 0 : ($peopleAhead * $handlingTime);

// Progress percentage calculation for the radial gauge
if ($token['status'] === 'serving') {
    $progressPercent = 90;
} else {
    // Gradual progression as ahead count decreases
    $progressPercent = max(15, min(85, (int)(100 - ($peopleAhead * 15))));
}

sendJSONResponse([
    'success'      => true,
    'has_token'    => true,
    'active_token' => [
        'id'                     => (int)$token['id'],
        'token_number'          => (int)$token['token_number'],
        'token_display'         => $token['token_display'],
        'status'                => $token['status'],
        'service_name'          => $token['service_name'],
        'service_category'      => $token['service_category'],
        'organization_name'     => $token['organization_name'],
        'campus_location'       => $token['campus_location'],
        'counter_number'        => $token['counter_number'] ?: 'Counter 02',
        'counter_name'          => $token['counter_name'] ?: 'Room 104, West Wing',
        'operator_name'         => $token['operator_name'] ?: 'Dr. Sarah Vance',
        'people_ahead'          => $peopleAhead,
        'estimated_wait_minutes'=> $estimatedWait,
        'progress_percent'      => $progressPercent,
        'created_at'            => $token['created_at'],
        'called_at'             => $token['called_at']
    ]
]);
