<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/config.php';

send_cors_headers();
require_method('POST');
require_admin();

$input = json_body();
$id = (int) ($input['id'] ?? 0);
if ($id <= 0) {
    json_error('A valid media id is required');
}

$pdo = db();
$stmt = $pdo->prepare('SELECT file_path FROM media_library WHERE id = :id');
$stmt->execute(['id' => $id]);
$media = $stmt->fetch();
if (!$media) {
    json_error('File not found', 404);
}

$pdo->prepare('DELETE FROM media_library WHERE id = :id')->execute(['id' => $id]);
@unlink(dirname(__DIR__, 2) . '/' . ltrim($media['file_path'], '/'));

json_ok(['deleted' => $id]);
