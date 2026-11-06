<?php
/**
 * QueueLess - Get Counters & Live Desk Status
 * File: php/operators/get_counters.php
 */
require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();

// Fetch counters with current token and waiting queue
$query = "
    SELECT 
        c.id,
        c.provider_id,
        c.service_id,
        c.counter_number,
        c.counter_name,
        c.status,
        c.current_token_id,
        s.name AS service_name,
        s.prefix AS service_prefix,
        s.category AS service_category,
        COALESCE(u_op.full_name, 'Unassigned') AS operator_name,
        COALESCE(t_curr.token_display, '—') AS current_token_display,
        t_curr.called_at AS current_token_called_at,
        COALESCE(waiting_summary.waiting_students, 0) AS waiting_count
    FROM counters c
    JOIN services s ON c.service_id = s.id
    LEFT JOIN users u_op ON c.operator_id = u_op.id
    LEFT JOIN tokens t_curr ON c.current_token_id = t_curr.id
    LEFT JOIN (
        SELECT service_id, COUNT(*) AS waiting_students
        FROM tokens
        WHERE status = 'waiting'
        GROUP BY service_id
    ) waiting_summary ON waiting_summary.service_id = c.service_id
    ORDER BY c.counter_number ASC
";

$stmt = $pdo->query($query);
$counters = $stmt->fetchAll();

// Also fetch current waiting tokens for active services
$waitingTokensStmt = $pdo->query("
    SELECT 
        t.id,
        t.token_number,
        t.token_display,
        t.service_id,
        t.status,
        t.created_at,
        s.name AS service_name,
        u.full_name AS student_name
    FROM tokens t
    JOIN services s ON t.service_id = s.id
    JOIN users u ON t.user_id = u.id
    WHERE t.status IN ('waiting', 'serving')
    ORDER BY t.status DESC, t.token_number ASC
    LIMIT 25
");
$liveTokens = $waitingTokensStmt->fetchAll();

// Daily performance stats
$statsStmt = $pdo->query("
    SELECT 
        COUNT(CASE WHEN status = 'completed' AND DATE(completed_at) = CURRENT_DATE() THEN 1 END) AS completed_today,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) AS waiting_now,
        COUNT(CASE WHEN status = 'serving' THEN 1 END) AS serving_now
    FROM tokens
");
$stats = $statsStmt->fetch();

sendJSONResponse([
    'success'     => true,
    'counters'    => $counters,
    'live_tokens' => $liveTokens,
    'metrics'     => [
        'completed_today' => (int)($stats['completed_today'] ?? 0),
        'waiting_now'     => (int)($stats['waiting_now'] ?? 0),
        'serving_now'     => (int)($stats['serving_now'] ?? 0)
    ]
]);
