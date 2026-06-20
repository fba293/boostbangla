<?php
/**
 * BoostBangla explicit database migration runner.
 * Never exposed to public callers: CLI or X-Admin-Secret only.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/database.php';

bb_security_headers(true);
bb_apply_cors('POST, GET, OPTIONS');
bb_require_admin_secret_or_cli();

try {
    $db = Database::getInstance();
    $db->initSchema();
    bb_json(['success' => true, 'message' => 'BoostBangla database schema migration completed.', 'time' => gmdate('c')]);
} catch (Throwable $error) {
    bb_log_safe('Database migration failed', ['error' => $error->getMessage()]);
    bb_fail('Database migration failed. Check protected server logs.', 500, ['code' => 'DB_MIGRATION_FAILED']);
}
