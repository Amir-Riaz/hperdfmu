<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('POST');
start_admin_session();

$input = json_body();
$email    = trim(strtolower($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($email === '' || $password === '') {
    json_error('Email and password are required');
}

$stmt = db()->prepare(
    'SELECT id, email, password_hash, display_name, role, is_active
     FROM admin_users WHERE email = :email LIMIT 1'
);
$stmt->execute(['email' => $email]);
$admin = $stmt->fetch();

// Same generic error whether the email doesn't exist or the password is
// wrong — don't tell an attacker which one it was.
if (!$admin || !password_verify($password, $admin['password_hash'])) {
    json_error('Invalid email or password', 401);
}

if ((int) $admin['is_active'] !== 1) {
    json_error('This account has been deactivated', 403);
}

// Prevent session fixation: issue a fresh session id on privilege change.
session_regenerate_id(true);

$_SESSION['admin_id'] = (int) $admin['id'];
$_SESSION['email']    = $admin['email'];
$_SESSION['role']     = $admin['role'];

// If the hashing cost/algorithm has changed since this hash was created,
// transparently re-hash with current defaults.
if (password_needs_rehash($admin['password_hash'], PASSWORD_DEFAULT)) {
    $rehash = password_hash($password, PASSWORD_DEFAULT);
    db()->prepare('UPDATE admin_users SET password_hash = :h WHERE id = :id')
        ->execute(['h' => $rehash, 'id' => $admin['id']]);
}

json_ok([
    'id'           => (int) $admin['id'],
    'email'        => $admin['email'],
    'display_name' => $admin['display_name'],
    'role'         => $admin['role'],
]);
