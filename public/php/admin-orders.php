<?php
/**
 * BoostBangla MySQL-first admin order read API.
 * Provider order status is written by protected cPanel cron, never by browser requests.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/database.php';

bb_security_headers(true);
bb_apply_cors('GET, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') bb_fail('GET is required.', 405);
$admin = bb_require_firebase_admin();
$action = strtolower((string)($_GET['action'] ?? 'list'));
$db = Database::getInstance();

function bb_admin_order_id($value) {
    if (!ctype_digit((string)$value)) bb_fail('A valid local order identifier is required.', 422);
    return (int)$value;
}

try {
    if ($action === 'list') {
        $limit = max(1, min(250, (int)($_GET['limit'] ?? 150)));
        $status = strtolower(trim((string)($_GET['status'] ?? '')));
        $allowed = ['pending','processing','in_progress','completed','partial','cancelled','failed','refunded'];
        $sql = 'SELECT id, user_id, service_id, service_name, link, quantity, user_price, amarboost_price, profit, amarboost_order_id, status, local_status, amarboost_status, sync_status, provider_request_state, provider_error, provider_requested_at, last_sync, created_at, updated_at FROM orders';
        $params = [];
        $types = '';
        if ($status !== '' && in_array($status, $allowed, true)) {
            $sql .= ' WHERE status = ?';
            $types = 's';
            $params[] = $status;
        }
        $sql .= ' ORDER BY created_at DESC LIMIT ?';
        $types .= 'i';
        $params[] = $limit;
        $orders = $db->getRows($sql, $types, $params);
        $summary = $db->getRow("SELECT COUNT(*) AS total_orders, COALESCE(SUM(user_price), 0) AS revenue, COALESCE(SUM(profit), 0) AS profit, COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),0) AS pending_orders, COALESCE(SUM(CASE WHEN status IN ('processing','in_progress','partial') THEN 1 ELSE 0 END),0) AS processing_orders, COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END),0) AS completed_orders FROM orders", '', []);
        bb_json(['success' => true,'orders' => $orders,'summary' => $summary,'total' => count($orders),'data_source' => 'mysql_provider_ledger','sync_mode' => 'cPanel cron writes provider status']);
    }
    if ($action === 'detail') {
        $id = bb_admin_order_id($_GET['order_id'] ?? $_GET['id'] ?? '');
        $order = $db->getRow('SELECT * FROM orders WHERE id = ? LIMIT 1', 'i', [$id]);
        if (!$order) bb_fail('Order not found.', 404);
        $logs = $db->getRows('SELECT action, status, error_message, created_at, updated_at FROM order_sync_log WHERE order_id = ? ORDER BY created_at DESC LIMIT 20', 'i', [$id]);
        $transactions = $db->getRows('SELECT transaction_type, amount, balance_before, balance_after, description, reference_id, created_at FROM order_transactions WHERE order_id = ? ORDER BY created_at ASC', 'i', [$id]);
        bb_json(['success' => true, 'order' => $order, 'sync_log' => $logs, 'transactions' => $transactions, 'data_source' => 'mysql_provider_ledger']);
    }
    bb_fail('Unsupported admin order action.', 400);
} catch (Throwable $error) {
    bb_log_safe('Admin order API failed', ['admin_id' => $admin['user_id'] ?? '', 'error' => $error->getMessage()]);
    bb_fail('Admin order data is temporarily unavailable.', 500, ['code' => 'ADMIN_ORDERS_FAILURE']);
}
