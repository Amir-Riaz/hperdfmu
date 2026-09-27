<?php
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth-middleware.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../config/db.php';

send_cors_headers();
require_method('POST');
$admin = require_admin();

// TinyMCE's default image upload handler posts the file under the field name "file";
// our own dashboard widgets post it as "image". Accept either.
$field = isset($_FILES['image']) ? 'image' : (isset($_FILES['file']) ? 'file' : null);
if ($field === null) {
    json_error('No image uploaded');
}

$file = $_FILES[$field];
if ($file['error'] !== UPLOAD_ERR_OK) {
    json_error('Upload failed (error code ' . $file['error'] . ')');
}
if ($file['size'] > MAX_IMAGE_BYTES) {
    json_error('Image exceeds the ' . human_file_size(MAX_IMAGE_BYTES) . ' limit');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!in_array($mime, ALLOWED_IMAGE_MIME, true)) {
    json_error('Unsupported image type: ' . $mime);
}

$destName = unique_filename($file['name']);
$destDir  = UPLOAD_ROOT . '/images';
if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
}
$destPath = $destDir . '/' . $destName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    json_error('Could not save the uploaded image', 500);
}

$relPath = UPLOAD_URL_BASE . '/images/' . $destName;

$pdo = db();
$stmt = $pdo->prepare(
    'INSERT INTO media_library (file_name, file_path, file_type, mime_type, file_size, uploaded_by)
     VALUES (:file_name, :file_path, "image", :mime_type, :file_size, :uploaded_by)'
);
$stmt->execute([
    'file_name'   => $file['name'],
    'file_path'   => $relPath,
    'mime_type'   => $mime,
    'file_size'   => $file['size'],
    'uploaded_by' => $admin['admin_id'],
]);

// TinyMCE's built-in "images_upload_handler" expects { "location": "<url>" }.
// Our own admin JS reads "url"/"path" — return both shapes in one response.
json_ok([
    'location' => $relPath,
    'url'      => $relPath,
    'path'     => $relPath,
    'id'       => (int) $pdo->lastInsertId(),
]);
