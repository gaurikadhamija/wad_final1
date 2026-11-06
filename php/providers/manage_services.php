<?php
/**
 * QueueLess - Provider Service Management Endpoint
 * File: php/providers/manage_services.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['provider', 'admin']);
$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = getRequestData();
    $name     = trim($data['name'] ?? '');
    $category = trim($data['category'] ?? 'Administration');
    $prefix   = strtoupper(trim($data['prefix'] ?? 'QL'));
    $time     = max(2, (int)($data['estimated_handling_time'] ?? 10));
    $desc     = trim($data['description'] ?? '');

    if (empty($name)) {
        sendJSONResponse(['success' => false, 'error' => 'Service name is required.'], 400);
    }

    // Find provider_id for current user (or fallback to provider 1)
    $provStmt = $pdo->prepare('SELECT id FROM providers WHERE user_id = :u_id LIMIT 1');
    $provStmt->execute([':u_id' => $currentUser['id']]);
    $prov = $provStmt->fetch();
    $providerId = $prov ? (int)$prov['id'] : 1;

    $stmt = $pdo->prepare('
        INSERT INTO services (provider_id, name, category, prefix, estimated_handling_time, is_active, description)
        VALUES (:p_id, :name, :cat, :prefix, :time, 1, :desc)
    ');
    $stmt->execute([
        ':p_id'   => $providerId,
        ':name'   => $name,
        ':cat'    => $category,
        ':prefix' => $prefix,
        ':time'   => $time,
        ':desc'   => $desc ?: null
    ]);
    $newId = (int)$pdo->lastInsertId();

    sendJSONResponse([
        'success'    => true,
        'message'    => 'Service "' . $name . '" created successfully.',
        'service_id' => $newId
    ], 201);
} else {
    // GET: List all services
    $stmt = $pdo->query('
        SELECT s.*, p.organization_name 
        FROM services s 
        JOIN providers p ON s.provider_id = p.id 
        ORDER BY s.category ASC, s.name ASC
    ');
    sendJSONResponse([
        'success'  => true,
        'services' => $stmt->fetchAll()
    ]);
}
