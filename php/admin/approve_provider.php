<?php
/**
 * QueueLess - Admin Approve/Reject Provider Endpoint
 * File: php/admin/approve_provider.php
 */
require_once __DIR__ . '/../config/database.php';

$adminUser = requireAuth(['admin']);
$adminId = $adminUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$providerId = (int)($data['provider_id'] ?? 0);
$status     = trim($data['status'] ?? 'approved'); // 'approved' or 'rejected'

if ($providerId <= 0 || !in_array($status, ['approved', 'rejected', 'pending'], true)) {
    sendJSONResponse(['success' => false, 'error' => 'Valid provider ID and status required.'], 400);
}

try {
    $stmt = $pdo->prepare('
        UPDATE providers 
        SET approval_status = :status, 
            approved_by = :admin_id, 
            approved_at = NOW() 
        WHERE id = :id
    ');
    $stmt->execute([
        ':status'   => $status,
        ':admin_id' => $adminId,
        ':id'       => $providerId
    ]);

    // Send notification to provider account
    $userStmt = $pdo->prepare('SELECT user_id, organization_name FROM providers WHERE id = :id');
    $userStmt->execute([':id' => $providerId]);
    $prov = $userStmt->fetch();

    if ($prov) {
        $notif = $pdo->prepare('INSERT INTO notifications (user_id, message, type) VALUES (:uid, :msg, "info")');
        $notif->execute([
            ':uid' => $prov['user_id'],
            ':msg' => 'Your campus provider registration for ' . $prov['organization_name'] . ' has been ' . $status . ' by Administrator.'
        ]);
    }

    sendJSONResponse([
        'success' => true,
        'message' => 'Provider status successfully updated to ' . $status . '.'
    ]);
} catch (Exception $e) {
    sendJSONResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
