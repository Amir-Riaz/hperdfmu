<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('GET');

$type      = $_GET['type'] ?? null;               // event | announcement | notice
$status    = $_GET['status'] ?? 'published';       // public callers should only ever get 'published'
$when      = $_GET['when'] ?? null;                // 'upcoming' | 'past' (events only)
$limit     = min(max((int) ($_GET['limit'] ?? 12), 1), 100);
$offset    = max((int) ($_GET['offset'] ?? 0), 0);
$search    = trim($_GET['search'] ?? '');
$isAdmin   = ($_GET['scope'] ?? '') === 'admin';

// The admin dashboard is the only caller allowed to see non-published posts,
// and it must present a valid admin session to do so.
if ($isAdmin) {
    require_once __DIR__ . '/../../includes/auth-middleware.php';
    require_admin();
    $status = $_GET['status'] ?? null; // admin may explicitly request any status, or omit for "all"
}

$where  = [];
$params = [];

if ($type !== null && in_array($type, ['event', 'announcement', 'notice'], true)) {
    $where[] = 'type = :type';
    $params['type'] = $type;
}
if ($status !== null && $status !== '') {
    $where[] = 'status = :status';
    $params['status'] = $status;
}
if ($search !== '') {
    $where[] = '(title LIKE :search OR body_html LIKE :search)';
    $params['search'] = '%' . $search . '%';
}
if ($when === 'upcoming') {
    $where[] = 'event_date >= CURDATE()';
} elseif ($when === 'past') {
    $where[] = 'event_date < CURDATE()';
}

$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
$orderSql = $type === 'event'
    ? ($when === 'past' ? 'ORDER BY event_date DESC' : 'ORDER BY event_date ASC')
    : 'ORDER BY created_at DESC';

$pdo = db();

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM posts $whereSql");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$sql = "SELECT id, title, slug, type, category, author, status, cover_image,
               event_date, start_time, end_time, venue, organizer,
               meta_description, created_at, updated_at
        FROM posts
        $whereSql
        $orderSql
        LIMIT :limit OFFSET :offset";

$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) {
    $stmt->bindValue(':' . $k, $v);
}
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$posts = $stmt->fetchAll();

json_ok([
    'posts'  => $posts,
    'total'  => $total,
    'limit'  => $limit,
    'offset' => $offset,
]);
