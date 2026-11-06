<?php
/**
 * QueueLess - Admin Provider Approval Endpoints
 * File: php/admin/get_providers.php
 */
require_once __DIR__ . '/../config/database.php';

requireAuth(['admin']);
$pdo = getDBConnection();

$query = "
    SELECT 
        p.id,
        p.organization_name,
        p.department,
        p.campus_location,
        p.approval_status,
        p.created_at,
        p.approved_at,
        u.id AS user_id,
        u.full_name AS applicant_name,
        u.email AS applicant_email,
        u.phone AS applicant_phone,
        COALESCE(u_app.full_name, '—') AS approved_by_name
    FROM providers p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN users u_app ON p.approved_by = u_app.id
    ORDER BY FIELD(p.approval_status, 'pending', 'approved', 'rejected'), p.id DESC
";

$stmt = $pdo->query($query);
sendJSONResponse([
    'success'   => true,
    'providers' => $stmt->fetchAll()
]);
