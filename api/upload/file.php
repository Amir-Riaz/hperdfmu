<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('POST');
$admin = require_admin();

if (!isset($_FILES['file'])) {
    json_error('No file uploaded');
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    json_error('Upload failed (error code ' . $file['error'] . ')');
}
if ($file['size'] > MAX_FILE_BYTES) {
    json_error('File exceeds the ' . human_file_size(MAX_FILE_BYTES) . ' limit');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!in_array($mime, ALLOWED_DOC_MIME, true)) {
    json_error('Unsupported file type: ' . $mime);
}

$destName = unique_filename($file['name']);
$destDir  = UPLOAD_ROOT . '/files';
if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
}
$destPath = $destDir . '/' . $destName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    json_error('Could not save the uploaded file', 500);
}

$relPath = UPLOAD_URL_BASE . '/files/' . $destName;
$fileType = classify_file_type($mime);

$pdo = db();
$stmt = $pdo->prepare(
    'INSERT INTO media_library (file_name, file_path, file_type, mime_type, file_size, uploaded_by)
     VALUES (:file_name, :file_path, :file_type, :mime_type, :file_size, :uploaded_by)'
);
$stmt->execute([
    'file_name'   => $file['name'],
    'file_path'   => $relPath,
    'file_type'   => $fileType,
    'mime_type'   => $mime,
    'file_size'   => $file['size'],
    'uploaded_by' => $admin['admin_id'],
]);

json_ok([
    'id'        => (int) $pdo->lastInsertId(),
    'file_name' => $file['name'],
    'file_path' => $relPath,
    'file_size' => $file['size'],
    'file_size_human' => human_file_size($file['size']),
    'file_type' => $fileType,
]);
