<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/response.php';

/**
 * Starts (or resumes) the admin PHP session with consistent cookie params.
 * Safe to call more than once per request.
 */
function start_admin_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name(SESSION_COOKIE_NAME);
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',
        // 'secure' is left off on purpose for local XAMPP testing over http://localhost.
        // Set this to true once the site is served over HTTPS in production.
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/**
 * Confirms an active session belongs to an active row in admin_users, and
 * returns that admin's record. Any failure sends a 401 JSON error and halts
 * execution.
 *
 * @return array{uid:string,email:string,admin_id:int,role:string}
 */
function require_admin(): array
{
    start_admin_session();

    if (empty($_SESSION['admin_id'])) {
        json_error('Not signed in — please log in again', 401);
    }

    // Re-check the DB every request (not just at login) so a deactivated
    // account is locked out immediately, without waiting for the session to expire.
    $stmt = db()->prepare(
        'SELECT id, email, role FROM admin_users WHERE id = :id AND is_active = 1 LIMIT 1'
    );
    $stmt->execute(['id' => $_SESSION['admin_id']]);
    $admin = $stmt->fetch();

    if (!$admin) {
        session_unset();
        session_destroy();
        json_error('This account is not authorized to access the CMS', 403);
    }

    return [
        'uid'      => (string) $admin['id'],
        'email'    => $admin['email'],
        'admin_id' => (int) $admin['id'],
        'role'     => $admin['role'],
    ];
}
