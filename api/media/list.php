<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('GET');
require_admin();

$type   = $_GET['type'] ?? null;       // image | pdf | doc | archive | other
$search = trim($_GET['search'] ?? '');
$limit  = min(max((int) ($_GET['limit'] ?? 60), 1), 200);
$offset = max((int) ($_GET['offset'] ?? 0), 0);

$where  = [];
$params = [];
if ($type !== null && $type !== '' && $type !== 'all') {
    $where[] = 'file_type = :type';
    $params['type'] = $type;
}
if ($search !== '') {
    $where[] = 'file_name LIKE :search';
    $params['search'] = '%' . $search . '%';
}
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$pdo = db();

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM media_library $whereSql");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT id, file_name, file_path, file_type, mime_type, file_size, created_at
     FROM media_library
     $whereSql
     ORDER BY created_at DESC
     LIMIT :limit OFFSET :offset"
);
foreach ($params as $k => $v) {
    $stmt->bindValue(':' . $k, $v);
}
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$files = $stmt->fetchAll();

foreach ($files as &$f) {
    $f['file_size_human'] = human_file_size((int) $f['file_size']);
}

json_ok(['files' => $files, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
