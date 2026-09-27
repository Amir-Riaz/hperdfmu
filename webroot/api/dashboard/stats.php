<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('GET');
require_admin();

$pdo = db();

$total     = (int) $pdo->query('SELECT COUNT(*) FROM posts')->fetchColumn();
$published = (int) $pdo->query("SELECT COUNT(*) FROM posts WHERE status = 'published'")->fetchColumn();
$drafts    = (int) $pdo->query("SELECT COUNT(*) FROM posts WHERE status = 'draft'")->fetchColumn();
$upcoming  = (int) $pdo->query(
    "SELECT COUNT(*) FROM posts WHERE type = 'event' AND status = 'published' AND event_date >= CURDATE()"
)->fetchColumn();

$recent = $pdo->query(
    "SELECT id, title, slug, type, status, updated_at
     FROM posts ORDER BY updated_at DESC LIMIT 8"
)->fetchAll();

json_ok([
    'total_posts'     => $total,
    'published'       => $published,
    'drafts'          => $drafts,
    'upcoming_events' => $upcoming,
    'recent_activity' => $recent,
]);
