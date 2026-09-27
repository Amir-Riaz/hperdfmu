<?php
/**
 * HPERD CMS — central configuration.
 * Copy this file to config.local.php (gitignored) on the server and adjust,
 * or set the values via real environment variables in production.
 */

// ---- Database ------------------------------------------------------------
define('DB_HOST', getenv('HPERD_DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('HPERD_DB_NAME') ?: 'hperd_cms');
define('DB_USER', getenv('HPERD_DB_USER') ?: 'root');
define('DB_PASS', getenv('HPERD_DB_PASS') ?: '');

// ---- Session-based auth (local, MySQL-backed) -----------------------
// Admin sessions are plain PHP sessions; the admin_users table stores a
// bcrypt password_hash (see includes/auth-middleware.php + api/auth/*.php).
// SESSION_LIFETIME is in seconds (0 = expires when the browser closes).
define('SESSION_LIFETIME', 60 * 60 * 8); // 8 hours
define('SESSION_COOKIE_NAME', 'hperd_admin_session');

// ---- Uploads ---------------------------------------------------------
define('UPLOAD_ROOT', dirname(__DIR__) . '/uploads');
define('UPLOAD_URL_BASE', '/uploads'); // public URL prefix for the uploads/ folder

define('MAX_IMAGE_BYTES', 8 * 1024 * 1024);   // 8 MB
define('MAX_FILE_BYTES', 25 * 1024 * 1024);   // 25 MB

define('ALLOWED_IMAGE_MIME', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
define('ALLOWED_DOC_MIME', [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
]);

// ---- CORS (only needed if the admin/public front-end is served from a
// different origin than the API; same-origin deployments can ignore this) ----
define('ALLOWED_ORIGIN', getenv('HPERD_ALLOWED_ORIGIN') ?: '');

date_default_timezone_set('Asia/Karachi');
error_reporting(E_ALL);
ini_set('display_errors', '0'); // never leak errors to API responses in production
