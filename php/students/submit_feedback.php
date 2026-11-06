<?php
/**
 * QueueLess - Submit Post-Service Feedback Endpoint
 * File: php/students/submit_feedback.php
 */
require_once __DIR__ . '/../config/database.php';

$currentUser = requireAuth(['student', 'admin', 'operator', 'provider']);
$userId = $currentUser['id'];
$pdo = getDBConnection();
$data = getRequestData();

$tokenId = (int)($data['token_id'] ?? 0);
$rating  = (int)($data['rating'] ?? 5);
$comments = trim($data['comments'] ?? '');

if ($tokenId <= 0 || $rating < 1 || $rating > 5) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Please provide a valid token ID and a rating between 1 and 5 stars.'
    ], 400);
}

// Verify token ownership and retrieve service_id
$stmt = $pdo->prepare('SELECT id, service_id, status FROM tokens WHERE id = :id AND user_id = :user_id');
$stmt->execute([
    ':id'      => $tokenId,
    ':user_id' => $userId
]);
$token = $stmt->fetch();

if (!$token) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Token not found or does not belong to your account.'
    ], 404);
}

try {
    // Insert or update feedback
    $feedbackStmt = $pdo->prepare('
        INSERT INTO feedback (token_id, user_id, service_id, rating, comments, created_at)
        VALUES (:token_id, :user_id, :service_id, :rating, :comments, NOW())
        ON DUPLICATE KEY UPDATE rating = :rating_up, comments = :comments_up, created_at = NOW()
    ');
    $feedbackStmt->execute([
        ':token_id'    => $tokenId,
        ':user_id'     => $userId,
        ':service_id'  => $token['service_id'],
        ':rating'      => $rating,
        ':comments'    => $comments ?: null,
        ':rating_up'   => $rating,
        ':comments_up' => $comments ?: null
    ]);

    sendJSONResponse([
        'success' => true,
        'message' => 'Thank you! Your feedback has been recorded successfully.'
    ]);
} catch (Exception $e) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Database error: ' . $e->getMessage()
    ], 500);
}
