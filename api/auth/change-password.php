<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('POST');
$admin = require_admin();

$input           = json_body();
$currentPassword = (string) ($input['current_password'] ?? '');
$newPassword     = (string) ($input['new_password'] ?? '');

if ($currentPassword === '' || $newPassword === '') {
    json_error('Current and new password are required');
}
if (strlen($newPassword) < 8) {
    json_error('New password must be at least 8 characters');
}

$stmt = db()->prepare('SELECT password_hash FROM admin_users WHERE id = :id LIMIT 1');
$stmt->execute(['id' => $admin['admin_id']]);
$row = $stmt->fetch();

if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
    json_error('Current password is incorrect', 401);
}

db()->prepare('UPDATE admin_users SET password_hash = :h WHERE id = :id')
    ->execute(['h' => password_hash($newPassword, PASSWORD_DEFAULT), 'id' => $admin['admin_id']]);

json_ok(['changed' => true]);
