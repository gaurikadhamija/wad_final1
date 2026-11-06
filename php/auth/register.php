<?php
/**
 * QueueLess - User Registration Endpoint
 * File: php/auth/register.php
 */
require_once __DIR__ . '/../config/database.php';

initSecureSession();
$pdo = getDBConnection();
$data = getRequestData();

$fullName = trim($data['full_name'] ?? '');
$email    = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$password = trim($data['password'] ?? '');
$phone    = trim($data['phone'] ?? '');
$role     = trim($data['role'] ?? 'student');
$orgName  = trim($data['organization_name'] ?? '');
$dept     = trim($data['department'] ?? '');
$location = trim($data['campus_location'] ?? '');

// Validation
if (empty($fullName) || !$email || empty($password)) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Please provide valid full name, email, and password.'
    ], 400);
}

if (strlen($password) < 6) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'Password must be at least 6 characters long.'
    ], 400);
}

// Allowed public registration roles
if (!in_array($role, ['student', 'provider', 'operator'], true)) {
    $role = 'student';
}

// Check existing email
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
if ($stmt->fetch()) {
    sendJSONResponse([
        'success' => false,
        'error'   => 'An account with this email address already exists.'
    ], 409);
}

// Hash password securely with BCRYPT
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

try {
    $pdo->beginTransaction();

    // Insert user
    $userStmt = $pdo->prepare(
        'INSERT INTO users (full_name, email, password_hash, role, phone, status) 
         VALUES (:full_name, :email, :password_hash, :role, :phone, "active")'
    );
    $userStmt->execute([
        ':full_name'     => $fullName,
        ':email'         => $email,
        ':password_hash' => $passwordHash,
        ':role'          => $role,
        ':phone'         => $phone ?: null
    ]);
    $userId = (int)$pdo->lastInsertId();

    // If registering as a provider, create provider profile awaiting admin approval
    if ($role === 'provider') {
        $providerStmt = $pdo->prepare(
            'INSERT INTO providers (user_id, organization_name, department, campus_location, approval_status)
             VALUES (:user_id, :organization_name, :department, :campus_location, "pending")'
        );
        $providerStmt->execute([
            ':user_id'           => $userId,
            ':organization_name' => $orgName ?: ($fullName . ' Desk'),
            ':department'        => $dept ?: 'General Services',
            ':campus_location'   => $location ?: 'Campus Center'
        ]);
    }

    $pdo->commit();

    // Establish session
    session_regenerate_id(true);
    $_SESSION['user_id']    = $userId;
    $_SESSION['user_name']  = $fullName;
    $_SESSION['user_email'] = $email;
    $_SESSION['user_role']  = $role;

    sendJSONResponse([
        'success' => true,
        'message' => 'Registration successful! Your account has been created.',
        'user'    => [
            'id'        => $userId,
            'full_name' => $fullName,
            'email'     => $email,
            'role'      => $role
        ]
    ], 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJSONResponse([
        'success' => false,
        'error'   => 'Failed to register account: ' . $e->getMessage()
    ], 500);
}
