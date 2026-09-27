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
    json_error('A valid post id is required');
}

$pdo = db();

$stmt = $pdo->prepare('SELECT cover_image FROM posts WHERE id = :id');
$stmt->execute(['id' => $id]);
$post = $stmt->fetch();
if (!$post) {
    json_error('Post not found', 404);
}

$imgStmt = $pdo->prepare('SELECT image_path FROM post_images WHERE post_id = :id');
$imgStmt->execute(['id' => $id]);
$galleryPaths = array_column($imgStmt->fetchAll(), 'image_path');

$attStmt = $pdo->prepare('SELECT file_path FROM attachments WHERE post_id = :id');
$attStmt->execute(['id' => $id]);
$attachmentPaths = array_column($attStmt->fetchAll(), 'file_path');

// post_images and attachments cascade-delete via the FK constraint.
$pdo->prepare('DELETE FROM posts WHERE id = :id')->execute(['id' => $id]);

// Best-effort cleanup of files on disk (media library entries are left intact
// since a file may be reused across posts).
foreach (array_filter([$post['cover_image']], fn($p) => !empty($p)) as $relPath) {
    @unlink(dirname(__DIR__, 2) . '/' . ltrim($relPath, '/'));
}
foreach (array_merge($galleryPaths, $attachmentPaths) as $relPath) {
    @unlink(dirname(__DIR__, 2) . '/' . ltrim($relPath, '/'));
}

json_ok(['deleted' => $id]);
