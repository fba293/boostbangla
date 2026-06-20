<?php
/**
 * Secure MySQL-first AmarBoost status synchronizer.
 * Run via cPanel cron (CLI) or with X-Admin-Secret.
 * It intentionally does not read/write Firestore REST data.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/provider-client.php';

bb_security_headers(true);
bb_apply_cors('GET, POST, OPTIONS');
bb_require_admin_secret_or_cli();

function bb_sync_input() {
    $input = $_GET;
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        $post = $_POST;
        if (!$post) {
            $decoded = json_decode(file_get_contents('php://input'), true);
            if (is_array($decoded)) $post = $decoded;
        }
        $input = array_merge($input, $post ?: []);
    }
    if (PHP_SAPI === 'cli') {
        foreach (array_slice($_SERVER['argv'] ?? [], 1) as $arg) {
            if (preg_match('/^--([^=]+)=(.*)$/', $arg, $m)) $input[$m[1]] = $m[2];
            if ($arg === '--force') $input['force'] = '1';
        }
    }
    return $input;
}

function bb_sync_summary($db, $provider, $input) {
    $limit = max(1, min(200, (int)($input['limit'] ?? 60)));
    $force = in_array((string)($input['force'] ?? ''), ['1','true','yes'], true);
    $minutes = max(1, min(1440, (int)($input['stale_minutes'] ?? 5)));
    $summary = [
        'success' => true,
        'provider_configured' => $provider->configured(),
        'processed' => 0,
        'updated' => 0,
        'unchanged' => 0,
        'failed' => 0,
        'skipped' => 0,
        'by_status' => [],
        'errors' => [],
        'started_at' => gmdate('c')
    ];
    if (!$provider->configured()) {
        $summary['success'] = false;
        $summary['error'] = 'AMARBOOST_API_KEY is not configured in the server environment.';
        return [$summary, 503];
    }

    $conditions = "amarboost_order_id IS NOT NULL AND amarboost_order_id > 0 AND status IN ('pending','processing','in_progress','partial')";
    if (!$force) $conditions .= " AND (last_sync IS NULL OR last_sync < DATE_SUB(NOW(), INTERVAL " . $minutes . " MINUTE))";
    $orders = $db->getRows(
        "SELECT id, amarboost_order_id, status, local_status, amarboost_status, retry_count FROM orders WHERE {$conditions} ORDER BY CASE WHEN status='processing' THEN 0 ELSE 1 END, last_sync ASC, created_at ASC LIMIT ?",
        'i', [$limit]
    );

    foreach ($orders as $order) {
        $summary['processed']++;
        $reply = $provider->status($order['amarboost_order_id']);
        if (!$reply['ok']) {
            $summary['failed']++;
            $summary['errors'][] = ['order_id' => (int)$order['id'], 'error' => $reply['error']];
            $db->update(
                'UPDATE orders SET retry_count = retry_count + 1, sync_status = ?, provider_error = ?, last_sync = NOW(), updated_at = NOW() WHERE id = ?',
                'ssi', ['pending', substr($reply['error'], 0, 600), (int)$order['id']]
            );
            $db->insert(
                'INSERT INTO order_sync_log (order_id, amarboost_order_id, action, response_data, status, error_message) VALUES (?, ?, ?, ?, ?, ?)',
                'iissss', [(int)$order['id'], (int)$order['amarboost_order_id'], 'status', json_encode($reply['data'] ?: ['http_status'=>$reply['status']]), 'failed', substr($reply['error'], 0, 600)]
            );
            continue;
        }

        $raw = strtolower((string)($reply['data']['status'] ?? 'pending'));
        $mapped = BoostBanglaProviderClient::mapStatus($raw);
        $changed = $mapped !== (string)$order['status'] || $raw !== strtolower((string)($order['amarboost_status'] ?? ''));
        $db->update(
            'UPDATE orders SET status = ?, local_status = ?, amarboost_status = ?, sync_status = ?, provider_error = NULL, provider_response = ?, last_sync = NOW(), updated_at = NOW() WHERE id = ?',
            'sssssi', [$mapped, $mapped, $raw, 'synced', json_encode($reply['data']), (int)$order['id']]
        );
        $db->insert(
            'INSERT INTO order_sync_log (order_id, amarboost_order_id, action, response_data, status) VALUES (?, ?, ?, ?, ?)',
            'iisss', [(int)$order['id'], (int)$order['amarboost_order_id'], 'status', json_encode($reply['data']), 'success']
        );
        $summary['by_status'][$mapped] = ($summary['by_status'][$mapped] ?? 0) + 1;
        if ($changed) $summary['updated']++; else $summary['unchanged']++;
    }

    $summary['finished_at'] = gmdate('c');
    $summary['limit'] = $limit;
    $summary['stale_minutes'] = $minutes;
    return [$summary, 200];
}

try {
    $input = bb_sync_input();
    $provider = new BoostBanglaProviderClient();
    if (!$provider->configured()) {
        bb_json(['success'=>false,'provider_configured'=>false,'error'=>'AMARBOOST_API_KEY is not configured in the server environment.'], 503);
    }
    $db = Database::getInstance();
    [$summary, $status] = bb_sync_summary($db, $provider, $input);
    bb_json($summary, $status);
} catch (Throwable $error) {
    error_log('BoostBangla sync-orders failed: ' . $error->getMessage());
    bb_fail('Order synchronization failed. Check the protected server logs.', 500, ['code'=>'ORDER_SYNC_FAILURE']);
}
