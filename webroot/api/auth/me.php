<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('GET');
$admin = require_admin(); // sends its own 401 JSON if no valid session

$stmt = db()->prepare('SELECT display_name FROM admin_users WHERE id = :id LIMIT 1');
$stmt->execute(['id' => $admin['admin_id']]);
$row = $stmt->fetch();

json_ok([
    'id'           => $admin['admin_id'],
    'email'        => $admin['email'],
    'role'         => $admin['role'],
    'display_name' => $row['display_name'] ?? null,
]);
