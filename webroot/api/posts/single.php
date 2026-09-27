<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('GET');

$slug = trim($_GET['slug'] ?? '');
$id   = (int) ($_GET['id'] ?? 0);
$isAdmin = ($_GET['scope'] ?? '') === 'admin';

if ($slug === '' && $id === 0) {
    json_error('Provide a slug or id');
}

$pdo = db();

if ($id > 0) {
    $stmt = $pdo->prepare('SELECT * FROM posts WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
} else {
    $stmt = $pdo->prepare('SELECT * FROM posts WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $slug]);
}
$post = $stmt->fetch();

if (!$post) {
    json_error('Post not found', 404);
}

// Public visitors may only fetch published posts; the admin dashboard (with
// a valid admin session) can preview drafts/scheduled posts.
if ($post['status'] !== 'published') {
    if (!$isAdmin) {
        json_error('Post not found', 404);
    }
    require_once __DIR__ . '/../../includes/auth-middleware.php';
    require_admin();
}

$imgStmt = $pdo->prepare('SELECT image_path FROM post_images WHERE post_id = :id ORDER BY sort_order ASC');
$imgStmt->execute(['id' => $post['id']]);
$post['gallery'] = array_column($imgStmt->fetchAll(), 'image_path');

$attStmt = $pdo->prepare('SELECT id, file_name, file_path, file_size, file_type FROM attachments WHERE post_id = :id');
$attStmt->execute(['id' => $post['id']]);
$post['attachments'] = $attStmt->fetchAll();

// Related posts: same type, published, excluding this one.
$relStmt = $pdo->prepare(
    'SELECT id, title, slug, cover_image, created_at FROM posts
     WHERE type = :type AND status = "published" AND id != :id
     ORDER BY created_at DESC LIMIT 3'
);
$relStmt->execute(['type' => $post['type'], 'id' => $post['id']]);
$post['related'] = $relStmt->fetchAll();

if ($post['status'] === 'published' && !$isAdmin) {
    $pdo->prepare('UPDATE posts SET views = views + 1 WHERE id = :id')->execute(['id' => $post['id']]);
}

json_ok($post);
