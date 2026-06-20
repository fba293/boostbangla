<?php
/**
 * Retired legacy Firestore REST synchronizer.
 * Use sync-orders.php for MySQL-first AmarBoost status synchronization.
 */
require_once __DIR__ . '/bootstrap.php';
bb_security_headers(true);
bb_apply_cors('GET, POST, OPTIONS');
bb_require_admin_secret_or_cli();
bb_json([
    'success' => false,
    'code' => 'LEGACY_SYNC_ENGINE_RETIRED',
    'message' => 'Use public/php/sync-orders.php from cPanel cron. The old Firestore REST sync engine is retired for security and consistency.',
    'replacement' => 'public/php/sync-orders.php'
], 410);
