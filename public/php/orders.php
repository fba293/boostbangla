<?php
/**
 * BoostBangla authenticated user order API.
 * Replaces unsafe user-id query parameters on api-proxy.php.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/database.php';

bb_security_headers(true);
bb_apply_cors('GET, POST, OPTIONS');

function bb_order_input() {
    $input = $_POST;
    if (!$input) {
        $decoded = json_decode(file_get_contents('php://input'), true);
        if (is_array($decoded)) $input = $decoded;
    }
    return $input ?: [];
}

function bb_order_normalize_id($value) {
    if (!ctype_digit((string)$value)) bb_fail('A valid order identifier is required.', 422);
    return (int)$value;
}

function bb_amarboost_status($orderId) {
    $key = getenv('AMARBOOST_API_KEY') ?: '';
    $url = getenv('AMARBOOST_API_URL') ?: 'https://amarboost.com/api/v2';
    if ($key === '') return ['success' => false, 'error' => 'AmarBoost API is not configured.'];
    $body = http_build_query(['key' => $key, 'action' => 'status', 'order' => (int)$orderId]);
    $response = false; $status = 0;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_RETURNTRANSFER=>true,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>25,CURLOPT_HTTPHEADER=>['Accept: application/json','Content-Type: application/x-www-form-urlencoded']]);
        $response=curl_exec($ch); $status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); $error=curl_error($ch); curl_close($ch);
        if ($response === false) return ['success'=>false,'error'=>$error ?: 'Provider network request failed'];
    } else {
        $ctx=stream_context_create(['http'=>['method'=>'POST','header'=>"Accept: application/json\r\nContent-Type: application/x-www-form-urlencoded\r\n",'content'=>$body,'timeout'=>25,'ignore_errors'=>true],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
        $response=@file_get_contents($url,false,$ctx); $line=$http_response_header[0]??''; if(preg_match('/\s(\d{3})\s/',$line,$m))$status=(int)$m[1];
        if($response===false)return ['success'=>false,'error'=>'Provider network request failed'];
    }
    $json=json_decode($response,true);
    if($status<200||$status>=300||!is_array($json)||isset($json['error']))return ['success'=>false,'error'=>is_array($json)&&isset($json['error'])?(is_string($json['error'])?$json['error']:json_encode($json['error'])):'Provider status request failed'];
    return ['success'=>true,'data'=>$json];
}

try {
    $claims = bb_require_firebase_user();
    $userId = $claims['user_id'];
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $input = $method === 'GET' ? $_GET : bb_order_input();
    $action = strtolower((string)($input['action'] ?? 'list'));
    $db = Database::getInstance();

    if ($action === 'list') {
        $limit = max(1, min(100, (int)($input['limit'] ?? 100)));
        $orders = $db->getRows('SELECT id, local_order_id, amarboost_order_id, service_id, service_name, link, quantity, user_price, amarboost_price, profit, status, local_status, amarboost_status, sync_status, provider_request_state, provider_error, created_at, updated_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', 'si', [$userId, $limit]);
        bb_json(['success' => true, 'orders' => $orders, 'total' => count($orders)]);
    }

    if ($action === 'detail') {
        $orderId = bb_order_normalize_id($input['order_id'] ?? $input['id'] ?? '');
        $order = $db->getRow('SELECT id, local_order_id, amarboost_order_id, service_id, service_name, link, quantity, user_price, amarboost_price, profit, status, local_status, amarboost_status, sync_status, provider_request_state, provider_error, created_at, updated_at FROM orders WHERE id = ? AND user_id = ? LIMIT 1', 'is', [$orderId, $userId]);
        if (!$order) bb_fail('Order not found.', 404);
        bb_json(['success' => true, 'order' => $order]);
    }

    if ($action === 'transactions') {
        $limit = max(1, min(100, (int)($input['limit'] ?? 100)));
        $transactions = $db->getRows('SELECT id, order_id, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at FROM order_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', 'si', [$userId, $limit]);
        bb_json(['success' => true, 'transactions' => $transactions, 'total' => count($transactions)]);
    }

    if ($action === 'refresh') {
        $orderId = bb_order_normalize_id($input['order_id'] ?? $input['id'] ?? '');
        $order = $db->getRow('SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1', 'is', [$orderId, $userId]);
        if (!$order) bb_fail('Order not found.', 404);
        if (empty($order['amarboost_order_id'])) bb_json(['success'=>true,'order_id'=>$orderId,'status'=>$order['local_status'] ?: $order['status'],'provider_status'=>null,'message'=>'Provider order reference is not available yet.']);
        $provider = bb_amarboost_status($order['amarboost_order_id']);
        if (!$provider['success']) bb_fail($provider['error'], 502, ['code'=>'AMARBOOST_STATUS_FAILED']);
        $raw = strtolower((string)($provider['data']['status'] ?? 'pending'));
        $map = ['pending'=>'pending','processing'=>'processing','inprogress'=>'processing','in_progress'=>'processing','completed'=>'completed','partial'=>'partial','cancelled'=>'cancelled','canceled'=>'cancelled','error'=>'failed','failed'=>'failed'];
        $status = $map[$raw] ?? 'pending';
        $db->update('UPDATE orders SET status = ?, local_status = ?, amarboost_status = ?, last_sync = NOW(), sync_status = ?, updated_at = NOW() WHERE id = ?', 'ssssi', [$status,$status,$raw,'synced',$orderId]);
        bb_json(['success'=>true,'order_id'=>$orderId,'status'=>$status,'provider_status'=>$raw,'start_count'=>$provider['data']['start_count'] ?? null,'remains'=>$provider['data']['remains'] ?? null]);
    }

    if ($action === 'cancel') {
        if ($method !== 'POST') bb_fail('POST action=cancel is required.', 405);
        $orderId = bb_order_normalize_id($input['order_id'] ?? $input['id'] ?? '');
        $db->beginTransaction();
        $order = $db->getRow('SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE', 'is', [$orderId, $userId]);
        if (!$order) { $db->rollback(); bb_fail('Order not found.', 404); }
        if (!empty($order['amarboost_order_id']) || in_array((string)$order['provider_request_state'], ['submitted', 'unknown'], true)) {
            $db->rollback();
            bb_fail('This order has already been sent to AmarBoost. Please create a support ticket for cancellation or refill review.', 409, ['code' => 'PROVIDER_ORDER_REQUIRES_REVIEW']);
        }
        if (!in_array((string)$order['status'], ['pending', 'failed'], true)) { $db->rollback(); bb_fail('This order is not eligible for automatic cancellation.', 409); }
        $wallet = $db->getRow('SELECT balance FROM user_wallets WHERE user_id = ? FOR UPDATE', 's', [$userId]);
        $before = (float)($wallet['balance'] ?? 0); $amount = (float)$order['user_price']; $after = round($before + $amount, 4); $reference = 'order-cancel:' . $orderId;
        $existing = $db->getRow('SELECT id FROM order_transactions WHERE reference_id = ? LIMIT 1', 's', [$reference]);
        if (!$existing) {
            $db->update('UPDATE user_wallets SET balance = ?, total_refunded = total_refunded + ? WHERE user_id = ?', 'dds', [$after, $amount, $userId]);
            $db->insert('INSERT INTO order_transactions (order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 'issdddss', [$orderId, $userId, 'refund', $amount, $before, $after, 'Order #' . $orderId . ' cancelled before provider submission', $reference]);
        }
        $db->update("UPDATE orders SET status = 'cancelled', local_status = 'cancelled', sync_status = 'failed', provider_request_state = 'cancelled', updated_at = NOW() WHERE id = ?", 'i', [$orderId]);
        $db->commit();
        bb_json(['success' => true, 'message' => 'Order cancelled and wallet amount returned.', 'order_id' => $orderId, 'balance_after' => $existing ? $before : $after]);
    }

    bb_fail('Unsupported order action.', 400);
} catch (Throwable $error) {
    try { if (isset($db)) $db->rollback(); } catch (Throwable $ignored) {}
    error_log('BoostBangla orders endpoint failed: ' . $error->getMessage());
    bb_fail('Order data request failed. Please try again.', 500, ['code' => 'ORDERS_ENDPOINT_FAILURE']);
}
