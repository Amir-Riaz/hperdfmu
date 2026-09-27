<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('POST');
$admin = require_admin();

$input = json_body();

$title = trim($input['title'] ?? '');
$type  = $input['type'] ?? 'announcement';

if ($title === '') {
    json_error('Title is required');
}
if (!in_array($type, ['event', 'announcement', 'notice'], true)) {
    json_error('Invalid content type');
}

$status = in_array($input['status'] ?? 'draft', ['draft', 'published', 'scheduled'], true)
    ? $input['status']
    : 'draft';

$slug = !empty($input['slug'])
    ? generate_slug($input['slug'])
    : generate_slug($title);

$bodyHtml = isset($input['body_html']) ? sanitize_rich_html($input['body_html']) : null;

$pdo = db();
$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare(
        'INSERT INTO posts
          (title, slug, type, category, author, status, scheduled_at, body_html, cover_image,
           event_date, start_time, end_time, venue, organizer,
           meta_title, meta_description, created_by)
         VALUES
          (:title, :slug, :type, :category, :author, :status, :scheduled_at, :body_html, :cover_image,
           :event_date, :start_time, :end_time, :venue, :organizer,
           :meta_title, :meta_description, :created_by)'
    );

    $stmt->execute([
        'title'            => $title,
        'slug'             => $slug,
        'type'             => $type,
        'category'         => $input['category'] ?? null,
        'author'           => $input['author'] ?? $admin['email'],
        'status'           => $status,
        'scheduled_at'     => $status === 'scheduled' ? ($input['scheduled_at'] ?? null) : null,
        'body_html'        => $bodyHtml,
        'cover_image'      => $input['cover_image'] ?? null,
        'event_date'       => $type === 'event' ? ($input['event_date'] ?? null) : null,
        'start_time'       => $type === 'event' ? ($input['start_time'] ?? null) : null,
        'end_time'         => $type === 'event' ? ($input['end_time'] ?? null) : null,
        'venue'            => $type === 'event' ? ($input['venue'] ?? null) : null,
        'organizer'        => $type === 'event' ? ($input['organizer'] ?? null) : null,
        'meta_title'       => $input['meta_title'] ?? null,
        'meta_description' => $input['meta_description'] ?? null,
        'created_by'       => $admin['admin_id'],
    ]);

    $postId = (int) $pdo->lastInsertId();

    // Gallery images: array of paths already uploaded via /api/upload/image.php
    if (!empty($input['gallery']) && is_array($input['gallery'])) {
        $imgStmt = $pdo->prepare(
            'INSERT INTO post_images (post_id, image_path, sort_order) VALUES (:post_id, :path, :sort)'
        );
        foreach (array_values($input['gallery']) as $i => $path) {
            $imgStmt->execute(['post_id' => $postId, 'path' => $path, 'sort' => $i]);
        }
    }

    // Attachments: array of {file_name, file_path, file_size, file_type}
    if (!empty($input['attachments']) && is_array($input['attachments'])) {
        $attStmt = $pdo->prepare(
            'INSERT INTO attachments (post_id, file_name, file_path, file_size, file_type)
             VALUES (:post_id, :file_name, :file_path, :file_size, :file_type)'
        );
        foreach ($input['attachments'] as $att) {
            $attStmt->execute([
                'post_id'   => $postId,
                'file_name' => $att['file_name'] ?? 'file',
                'file_path' => $att['file_path'] ?? '',
                'file_size' => $att['file_size'] ?? 0,
                'file_type' => $att['file_type'] ?? 'other',
            ]);
        }
    }

    $pdo->commit();
    json_ok(['id' => $postId, 'slug' => $slug], 201);
} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('[HPERD CMS] create.php: ' . $e->getMessage());
    json_error('Could not create post', 500);
}
