<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('POST');
$admin = require_admin();

$input = json_body();
$id = (int) ($input['id'] ?? 0);
if ($id <= 0) {
    json_error('A valid post id is required');
}

$pdo = db();
$existing = $pdo->prepare('SELECT * FROM posts WHERE id = :id LIMIT 1');
$existing->execute(['id' => $id]);
$post = $existing->fetch();
if (!$post) {
    json_error('Post not found', 404);
}

$title = trim($input['title'] ?? $post['title']);
$type  = in_array($input['type'] ?? $post['type'], ['event', 'announcement', 'notice'], true)
    ? $input['type'] ?? $post['type']
    : $post['type'];
$status = in_array($input['status'] ?? $post['status'], ['draft', 'published', 'scheduled'], true)
    ? $input['status'] ?? $post['status']
    : $post['status'];

$slug = $post['slug'];
if (!empty($input['slug']) && $input['slug'] !== $post['slug']) {
    $slug = generate_slug($input['slug'], $id);
} elseif ($title !== $post['title'] && empty($input['slug'])) {
    // Title changed but caller did not explicitly re-slug: keep the existing slug
    // to avoid breaking already-shared links.
    $slug = $post['slug'];
}

$bodyHtml = array_key_exists('body_html', $input)
    ? sanitize_rich_html($input['body_html'])
    : $post['body_html'];

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare(
        'UPDATE posts SET
            title = :title, slug = :slug, type = :type, category = :category,
            author = :author, status = :status, scheduled_at = :scheduled_at,
            body_html = :body_html, cover_image = :cover_image,
            event_date = :event_date, start_time = :start_time, end_time = :end_time,
            venue = :venue, organizer = :organizer,
            meta_title = :meta_title, meta_description = :meta_description
         WHERE id = :id'
    );

    $stmt->execute([
        'title'            => $title,
        'slug'             => $slug,
        'type'             => $type,
        'category'         => $input['category'] ?? $post['category'],
        'author'           => $input['author'] ?? $post['author'],
        'status'           => $status,
        'scheduled_at'     => $status === 'scheduled' ? ($input['scheduled_at'] ?? $post['scheduled_at']) : null,
        'body_html'        => $bodyHtml,
        'cover_image'      => array_key_exists('cover_image', $input) ? $input['cover_image'] : $post['cover_image'],
        'event_date'       => $type === 'event' ? ($input['event_date'] ?? $post['event_date']) : null,
        'start_time'       => $type === 'event' ? ($input['start_time'] ?? $post['start_time']) : null,
        'end_time'         => $type === 'event' ? ($input['end_time'] ?? $post['end_time']) : null,
        'venue'            => $type === 'event' ? ($input['venue'] ?? $post['venue']) : null,
        'organizer'        => $type === 'event' ? ($input['organizer'] ?? $post['organizer']) : null,
        'meta_title'       => $input['meta_title'] ?? $post['meta_title'],
        'meta_description' => $input['meta_description'] ?? $post['meta_description'],
        'id'               => $id,
    ]);

    // Replace gallery wholesale when the caller supplies one.
    if (array_key_exists('gallery', $input) && is_array($input['gallery'])) {
        $pdo->prepare('DELETE FROM post_images WHERE post_id = :id')->execute(['id' => $id]);
        $imgStmt = $pdo->prepare(
            'INSERT INTO post_images (post_id, image_path, sort_order) VALUES (:post_id, :path, :sort)'
        );
        foreach (array_values($input['gallery']) as $i => $path) {
            $imgStmt->execute(['post_id' => $id, 'path' => $path, 'sort' => $i]);
        }
    }

    // Replace attachments wholesale when the caller supplies them.
    if (array_key_exists('attachments', $input) && is_array($input['attachments'])) {
        $pdo->prepare('DELETE FROM attachments WHERE post_id = :id')->execute(['id' => $id]);
        $attStmt = $pdo->prepare(
            'INSERT INTO attachments (post_id, file_name, file_path, file_size, file_type)
             VALUES (:post_id, :file_name, :file_path, :file_size, :file_type)'
        );
        foreach ($input['attachments'] as $att) {
            $attStmt->execute([
                'post_id'   => $id,
                'file_name' => $att['file_name'] ?? 'file',
                'file_path' => $att['file_path'] ?? '',
                'file_size' => $att['file_size'] ?? 0,
                'file_type' => $att['file_type'] ?? 'other',
            ]);
        }
    }

    $pdo->commit();
    json_ok(['id' => $id, 'slug' => $slug]);
} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('[HPERD CMS] update.php: ' . $e->getMessage());
    json_error('Could not update post', 500);
}
