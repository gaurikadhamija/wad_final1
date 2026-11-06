<?php
/**
 * QueueLess - Provider Counter Management Endpoint
 * File: php/providers/manage_counters.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['provider', 'admin']);
$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = getRequestData();
    $action = $data['action'] ?? 'create';

    if ($action === 'create') {
        $serviceId   = (int)($data['service_id'] ?? 1);
        $counterNum  = trim($data['counter_number'] ?? 'Counter 04');
        $counterName = trim($data['counter_name'] ?? 'General Window');

        // Provider lookup
        $provStmt = $pdo->prepare('SELECT id FROM providers WHERE user_id = :u_id LIMIT 1');
        $provStmt->execute([':u_id' => $currentUser['id']]);
        $prov = $provStmt->fetch();
        $providerId = $prov ? (int)$prov['id'] : 1;

        $stmt = $pdo->prepare('
            INSERT INTO counters (provider_id, service_id, counter_number, counter_name, status)
            VALUES (:p_id, :s_id, :num, :name, "idle")
        ');
        $stmt->execute([
            ':p_id' => $providerId,
            ':s_id' => $serviceId,
            ':num'  => $counterNum,
            ':name' => $counterName
        ]);

        sendJSONResponse([
            'success'    => true,
            'message'    => 'Counter "' . $counterName . '" added successfully.',
            'counter_id' => (int)$pdo->lastInsertId()
        ], 201);
    } elseif ($action === 'update_status') {
        $counterId = (int)($data['counter_id'] ?? 0);
        $status    = $data['status'] ?? 'idle';

        if (!in_array($status, ['idle', 'serving', 'paused', 'offline'], true)) {
            $status = 'idle';
        }

        $stmt = $pdo->prepare('UPDATE counters SET status = :status WHERE id = :id');
        $stmt->execute([':status' => $status, ':id' => $counterId]);

        sendJSONResponse([
            'success' => true,
            'message' => 'Counter status updated to ' . $status
        ]);
    }
} else {
    // GET: List counters
    $stmt = $pdo->query('
        SELECT c.*, s.name AS service_name, u.full_name AS operator_name
        FROM counters c
        JOIN services s ON c.service_id = s.id
        LEFT JOIN users u ON c.operator_id = u.id
        ORDER BY c.counter_number ASC
    ');
    sendJSONResponse([
        'success'  => true,
        'counters' => $stmt->fetchAll()
    ]);
}
