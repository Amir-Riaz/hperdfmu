<?php
/**
 * Local/testing signup endpoint — creates a new row in admin_users.
 *
 * There is no Firebase Console step anymore: this is how you create the
 * very first admin account (and any additional ones) while testing on
 * XAMPP. The first account ever created becomes role 'admin'; every
 * account after that is created as 'editor'.
 *
 * Before going live on a real server, either delete this file or lock it
 * down (e.g. require an existing admin's session, or a one-time setup
 * token) — an open signup endpoint is fine on localhost, not on the internet.
 */
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('POST');
start_admin_session();

$input        = json_body();
$email        = trim(strtolower($input['email'] ?? ''));
$password     = (string) ($input['password'] ?? '');
$confirm      = (string) ($input['confirm_password'] ?? '');
$display_name = trim($input['display_name'] ?? '');

if ($email === '' || $password === '') {
    json_error('Email and password are required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Enter a valid email address');
}
if (strlen($password) < 8) {
    json_error('Password must be at least 8 characters');
}
if ($confirm !== '' && $password !== $confirm) {
    json_error('Passwords do not match');
}

$exists = db()->prepare('SELECT id FROM admin_users WHERE email = :email LIMIT 1');
$exists->execute(['email' => $email]);
if ($exists->fetch()) {
    json_error('An account with that email already exists', 409);
}

$countStmt = db()->query('SELECT COUNT(*) AS c FROM admin_users');
$isFirstUser = ((int) $countStmt->fetch()['c']) === 0;

$stmt = db()->prepare(
    'INSERT INTO admin_users (email, password_hash, display_name, role, is_active)
     VALUES (:email, :password_hash, :display_name, :role, 1)'
);
$stmt->execute([
    'email'         => $email,
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    'display_name'  => $display_name !== '' ? $display_name : null,
    'role'          => $isFirstUser ? 'admin' : 'editor',
]);

$newId = (int) db()->lastInsertId();

// Log the new account straight in, same as after a successful login.
session_regenerate_id(true);
$_SESSION['admin_id'] = $newId;
$_SESSION['email']    = $email;
$_SESSION['role']     = $isFirstUser ? 'admin' : 'editor';

json_ok([
    'id'           => $newId,
    'email'        => $email,
    'display_name' => $display_name !== '' ? $display_name : null,
    'role'         => $isFirstUser ? 'admin' : 'editor',
], 201);
