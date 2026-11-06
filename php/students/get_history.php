<?php
/**
 * QueueLess - Student Token History Endpoint
 * File: php/students/get_history.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['student', 'admin', 'operator', 'provider']);
$userId = $currentUser['id'];
$pdo = getDBConnection();

$query = "
    SELECT 
        t.id,
        t.token_display,
        t.status,
        t.created_at,
        t.called_at,
        t.completed_at,
        s.name AS service_name,
        s.category AS service_category,
        COALESCE(c.counter_name, 'Service Window') AS counter_name,
        COALESCE(f.rating, 0) AS user_rating,
        f.comments AS user_comments
    FROM tokens t
    JOIN services s ON t.service_id = s.id
    LEFT JOIN counters c ON t.counter_id = c.id
    LEFT JOIN feedback f ON f.token_id = t.id
    WHERE t.user_id = :user_id
    ORDER BY t.id DESC
    LIMIT 50
";

$stmt = $pdo->prepare($query);
$stmt->execute([':user_id' => $userId]);
$history = $stmt->fetchAll();

sendJSONResponse([
    'success' => true,
    'history' => $history
]);
