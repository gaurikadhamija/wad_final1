<?php
/**
 * QueueLess - Get Campus Services Endpoint
 * File: php/students/get_services.php
 */
require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();
$today = date('Y-m-d');

// Query active services with live queue and waiting count
$query = "
    SELECT 
        s.id,
        s.name,
        s.category,
        s.prefix,
        s.estimated_handling_time,
        s.description,
        p.organization_name,
        p.campus_location,
        COALESCE(q.id, 0) AS queue_id,
        COALESCE(q.status, 'open') AS queue_status,
        COALESCE(waiting_counts.total_waiting, 0) AS waiting_count,
        COALESCE(counters_info.total_counters, 1) AS total_counters,
        counters_info.active_counter_names
    FROM services s
    JOIN providers p ON s.provider_id = p.id
    LEFT JOIN queues q ON q.service_id = s.id AND q.queue_date = :today
    LEFT JOIN (
        SELECT service_id, COUNT(*) AS total_waiting
        FROM tokens
        WHERE status = 'waiting'
        GROUP BY service_id
    ) waiting_counts ON waiting_counts.service_id = s.id
    LEFT JOIN (
        SELECT service_id, COUNT(*) AS total_counters, GROUP_CONCAT(counter_name SEPARATOR ', ') AS active_counter_names
        FROM counters
        WHERE status != 'offline'
        GROUP BY service_id
    ) counters_info ON counters_info.service_id = s.id
    WHERE s.is_active = 1 AND p.approval_status = 'approved'
    ORDER BY s.category ASC, s.name ASC
";

$stmt = $pdo->prepare($query);
$stmt->execute([':today' => $today]);
$services = $stmt->fetchAll();

// Calculate realistic estimated wait time per service
foreach ($services as &$svc) {
    $handlingTime = (int)$svc['estimated_handling_time'];
    $waiting = (int)$svc['waiting_count'];
    $counters = max(1, (int)$svc['total_counters']);
    $svc['estimated_wait_minutes'] = (int)ceil(($waiting * $handlingTime) / $counters);
}

sendJSONResponse([
    'success'  => true,
    'services' => $services
]);
