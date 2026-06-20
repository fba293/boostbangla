<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/config.php';

bb_security_headers(true);
bb_apply_cors('POST, GET, OPTIONS');

if (($_GET['action'] ?? '') === 'health') {
    bb_json([
        'success' => true,
        'service' => 'BoostBangla secure AmarBoost order handler',
        'provider_configured' => AMARBOOST_API_KEY !== '',
        'provider_url' => AMARBOOST_API_URL,
        'curl_available' => function_exists('curl_init'),
        'openssl_available' => function_exists('openssl_verify'),
        'time' => gmdate('c')
    ]);
}

class BoostBanglaOrderHandler {
    private $db;
    private $providerKey;
    private $providerUrl;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->providerKey = AMARBOOST_API_KEY;
        $this->providerUrl = AMARBOOST_API_URL;
    }

    public function place($data, $userId) {
        $requestId = $this->validate($data);
        if ($this->providerKey === '') return $this->fail('AmarBoost API is not configured on the server.', 'PROVIDER_NOT_CONFIGURED', 503);
        $existing = $this->findExisting($userId, $requestId);
        if ($existing) return $this->existingPayload($existing, true);
        $service = $this->loadTrustedService((int)$data['service_id']);
        if (!$service) return $this->fail('This service is not available from AmarBoost right now. Refresh services and try again.', 'SERVICE_UNAVAILABLE', 409);
        $quantity = (int)$data['quantity'];
        if ($quantity < (int)$service['min_order'] || $quantity > (int)$service['max_order']) return $this->fail('Quantity must be between ' . (int)$service['min_order'] . ' and ' . (int)$service['max_order'] . '.', 'INVALID_QUANTITY', 422);
        $pricing = $this->price($service, $quantity);

        try {
            $this->db->beginTransaction();
            $existing = $this->db->getRow('SELECT * FROM orders WHERE user_id = ? AND client_request_id = ? FOR UPDATE', 'ss', [$userId, $requestId]);
            if ($existing) { $this->db->commit(); return $this->existingPayload($existing, true); }
            $this->db->execute('INSERT INTO user_wallets (user_id, balance) VALUES (?, 0) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)', 's', [$userId]);
            $wallet = $this->db->getRow('SELECT balance FROM user_wallets WHERE user_id = ? FOR UPDATE', 's', [$userId]);
            $balance = (float)($wallet['balance'] ?? 0);
            if ($balance < $pricing['user_price']) { $this->db->rollback(); return $this->fail('Insufficient wallet balance.', 'INSUFFICIENT_BALANCE', 402); }
            $localId = $this->db->insert('INSERT INTO orders (user_id, service_id, service_name, link, quantity, base_rate, user_price, amarboost_price, profit, client_request_id, provider_request_state, status, local_status, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 'sissiddddsssss', [$userId, (int)$service['service_id'], $service['service_name'], trim($data['link']), $quantity, $pricing['provider_usd_rate'], $pricing['user_price'], $pricing['amarboost_cost'], $pricing['profit'], $requestId, 'reserved', 'pending', 'reserved', 'pending']);
            $after = round($balance - $pricing['user_price'], 4);
            $this->db->update('UPDATE user_wallets SET balance = ?, total_spent = total_spent + ?, lifetime_spent = lifetime_spent + ? WHERE user_id = ?', 'ddds', [$after, $pricing['user_price'], $pricing['user_price'], $userId]);
            $this->db->insert('INSERT INTO order_transactions (order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 'issdddss', [$localId, $userId, 'debit', $pricing['user_price'], $balance, $after, 'Order #' . $localId . ' reserved for AmarBoost', $requestId . ':debit']);
            $this->db->insert('INSERT INTO order_sync_log (order_id, action, request_data, status) VALUES (?, ?, ?, ?)', 'isss', [$localId, 'add', json_encode(['service_id'=>(int)$service['service_id'],'quantity'=>$quantity,'request_id'=>$requestId]), 'pending']);
            $this->db->commit();
        } catch (Throwable $error) {
            try { $this->db->rollback(); } catch (Throwable $ignored) {}
            error_log('BoostBangla order reservation failed: ' . $error->getMessage());
            return $this->fail('Could not reserve this order. Please try again.', 'ORDER_RESERVATION_FAILED', 500);
        }

        $provider = $this->sendToAmarBoost($service, $data, $quantity);
        if ($provider['success']) {
            try {
                $this->db->update('UPDATE orders SET amarboost_order_id = ?, status = ?, local_status = ?, sync_status = ?, provider_request_state = ?, provider_response = ?, provider_error = NULL, provider_requested_at = NOW(), updated_at = NOW() WHERE id = ?', 'isssssi', [(int)$provider['order_id'], 'processing', 'processing', 'synced', 'submitted', json_encode($provider['response']), $localId]);
                $this->db->update('UPDATE order_sync_log SET amarboost_order_id = ?, response_data = ?, status = ?, updated_at = NOW() WHERE order_id = ? AND action = ? ORDER BY id DESC LIMIT 1', 'issis', [(int)$provider['order_id'], json_encode($provider['response']), 'success', $localId, 'add']);
            } catch (Throwable $error) { error_log('BoostBangla local provider link failed after accepted provider order: ' . $error->getMessage()); }
            return ['success'=>true,'local_order_id'=>$localId,'amarboost_order_id'=>(int)$provider['order_id'],'status'=>'processing','pricing'=>$pricing,'balance_after'=>$after,'message'=>'Order sent directly to AmarBoost.','data'=>['local_order_id'=>$localId,'amarboost_order_id'=>(int)$provider['order_id'],'status'=>'processing','pricing'=>$pricing,'balance_after'=>$after]];
        }
        if ($provider['ambiguous']) {
            $this->db->update('UPDATE orders SET provider_request_state = ?, local_status = ?, sync_status = ?, provider_error = ?, provider_response = ?, provider_requested_at = NOW(), updated_at = NOW() WHERE id = ?', 'sssssi', ['unknown', 'provider_confirmation_pending', 'pending', $provider['error'], json_encode($provider['response']), $localId]);
            $this->db->update('UPDATE order_sync_log SET response_data = ?, status = ?, error_message = ?, updated_at = NOW() WHERE order_id = ? AND action = ? ORDER BY id DESC LIMIT 1', 'sssis', [json_encode($provider['response']), 'pending', $provider['error'], $localId, 'add']);
            return ['success'=>true,'local_order_id'=>$localId,'status'=>'pending_confirmation','pricing'=>$pricing,'balance_after'=>$after,'message'=>'Your order request was sent and is being confirmed. Please do not submit it again.','needs_confirmation'=>true,'data'=>['local_order_id'=>$localId,'status'=>'pending_confirmation','pricing'=>$pricing,'balance_after'=>$after]];
        }
        try {
            $this->db->beginTransaction();
            $wallet = $this->db->getRow('SELECT balance FROM user_wallets WHERE user_id = ? FOR UPDATE', 's', [$userId]);
            $before = (float)($wallet['balance'] ?? 0);
            $this->db->update('UPDATE user_wallets SET balance = ?, total_refunded = total_refunded + ? WHERE user_id = ?', 'dds', [round($before + $pricing['user_price'], 4), $pricing['user_price'], $userId]);
            $this->db->insert('INSERT INTO order_transactions (order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 'issdddss', [$localId, $userId, 'refund', $pricing['user_price'], $before, round($before + $pricing['user_price'], 4), 'Order #' . $localId . ' refunded because AmarBoost rejected the request', $requestId . ':refund']);
            $this->db->update('UPDATE orders SET status = ?, local_status = ?, sync_status = ?, provider_request_state = ?, provider_error = ?, provider_response = ?, provider_requested_at = NOW(), updated_at = NOW() WHERE id = ?', 'ssssssi', ['failed','failed','failed','rejected',$provider['error'],json_encode($provider['response']),$localId]);
            $this->db->commit();
        } catch (Throwable $error) { try { $this->db->rollback(); } catch (Throwable $ignored) {} }
        return $this->fail('AmarBoost rejected this order. Your reserved wallet amount was returned.', 'AMARBOOST_REJECTED', 502);
    }

    private function validate($data) {
        if (!ctype_digit((string)($data['service_id'] ?? ''))) throw new Exception('A valid service is required.');
        if (!filter_var(trim($data['link'] ?? ''), FILTER_VALIDATE_URL)) throw new Exception('A valid public URL is required.');
        if (!ctype_digit((string)($data['quantity'] ?? '')) || (int)$data['quantity'] < 1) throw new Exception('A valid quantity is required.');
        $requestId = trim((string)($data['request_id'] ?? ($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? '')));
        if (!preg_match('/^[A-Za-z0-9_-]{16,96}$/', $requestId)) throw new Exception('A valid request identifier is required.');
        return $requestId;
    }
    private function findExisting($userId, $requestId) { return $this->db->getRow('SELECT * FROM orders WHERE user_id = ? AND client_request_id = ? LIMIT 1', 'ss', [$userId, $requestId]); }
    private function existingPayload($order, $idempotent) { $pending=($order['provider_request_state']??'')==='unknown'; return ['success'=>true,'local_order_id'=>(int)$order['id'],'amarboost_order_id'=>$order['amarboost_order_id']?(int)$order['amarboost_order_id']:null,'status'=>$pending?'pending_confirmation':($order['status']??'pending'),'pricing'=>['user_price'=>(float)$order['user_price'],'amarboost_cost'=>(float)$order['amarboost_price'],'profit'=>(float)$order['profit']],'balance_after'=>null,'idempotent'=>$idempotent,'needs_confirmation'=>$pending,'message'=>$pending?'This order is already being confirmed. Please do not submit it again.':'Existing order request returned safely.','data'=>['local_order_id'=>(int)$order['id'],'amarboost_order_id'=>$order['amarboost_order_id']?(int)$order['amarboost_order_id']:null,'status'=>$pending?'pending_confirmation':($order['status']??'pending')]]; }
    private function loadTrustedService($serviceId) { $providerService=$this->fetchProviderService($serviceId); if(!$providerService)return null; $this->cacheProviderService($providerService); return $this->db->getRow('SELECT * FROM services_cache WHERE service_id = ? AND is_active = 1 LIMIT 1', 'i', [$serviceId]); }
    private function fetchProviderService($serviceId) { $call=$this->providerCall(['action'=>'services']); if(!$call['ok'])return null; $list=$call['json']['services']??(is_array($call['json'])?$call['json']:[]); foreach($list as $service){$id=$service['service']??$service['id']??$service['service_id']??null;if((string)$id===(string)$serviceId)return $service;} return null; }
    private function cacheProviderService($service) { $serviceId=(int)($service['service']??$service['id']??$service['service_id']);$usdRate=(float)($service['rate']??$service['price']??0);$providerCost=round($usdRate*USD_TO_BDT,4);$userRate=round($providerCost*PROFIT_MARGIN*PLATFORM_FEE,4);$markup=$providerCost>0?(int)round((($userRate/$providerCost)-1)*100):0;$name=substr(trim((string)($service['name']??'AmarBoost service')),0,255);$category=substr(trim((string)($service['category']??'other')),0,100);$min=max(1,(int)($service['min']??$service['min_order']??1));$max=max($min,(int)($service['max']??$service['max_order']??100000));$this->db->execute('INSERT INTO services_cache (service_id, service_name, category, base_rate, user_price, amarboost_price, markup_percent, min_order, max_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE service_name=VALUES(service_name), category=VALUES(category), base_rate=VALUES(base_rate), user_price=VALUES(user_price), amarboost_price=VALUES(amarboost_price), markup_percent=VALUES(markup_percent), min_order=VALUES(min_order), max_order=VALUES(max_order), is_active=1, updated_at=NOW()', 'issdddiii', [$serviceId,$name,$category,$usdRate,$userRate,$providerCost,$markup,$min,$max]); }
    private function price($service, $quantity) { $providerUsd=(float)$service['base_rate'];$userRate=(float)$service['user_price'];$providerRate=(float)$service['amarboost_price'];if($providerRate<=0)$providerRate=round($providerUsd*USD_TO_BDT,4);if($userRate<=0)$userRate=round($providerRate*PROFIT_MARGIN*PLATFORM_FEE,4);$customer=round(($userRate/1000)*$quantity,4);$provider=round(($providerRate/1000)*$quantity,4);return ['provider_usd_rate'=>$providerUsd,'user_rate_per_1000'=>$userRate,'provider_cost_per_1000'=>$providerRate,'user_price'=>$customer,'amarboost_cost'=>$provider,'profit'=>round($customer-$provider,4),'currency'=>'BDT']; }
    private function sendToAmarBoost($service, $data, $quantity) { $payload=['action'=>'add','service'=>(int)$service['service_id'],'link'=>trim($data['link']),'quantity'=>$quantity];if(!empty($data['custom_data']))$payload['custom_data']=substr((string)$data['custom_data'],0,500);$call=$this->providerCall($payload);$json=$call['json'];$order=$json['order']??$json['order_id']??null;if($call['ok']&&$order)return ['success'=>true,'order_id'=>$order,'response'=>$json,'error'=>'','ambiguous'=>false];$error=is_array($json)&&isset($json['error'])?(is_string($json['error'])?$json['error']:json_encode($json['error'])):($call['error']?:'AmarBoost did not return an order id.');$ambiguous=$call['network_error']||($call['status']>=500)||($call['status']===0);return ['success'=>false,'response'=>$json?:['http_status'=>$call['status']],'error'=>substr((string)$error,0,600),'ambiguous'=>$ambiguous]; }
    private function providerCall($payload) { $payload['key']=$this->providerKey;$body=http_build_query($payload);$result=['ok'=>false,'status'=>0,'body'=>'','json'=>null,'error'=>'','network_error'=>false];if(function_exists('curl_init')){$ch=curl_init($this->providerUrl);curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>35,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HTTPHEADER=>['Accept: application/json','Content-Type: application/x-www-form-urlencoded'],CURLOPT_USERAGENT=>'BoostBangla/4.0']);$out=curl_exec($ch);$result['status']=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);$result['error']=curl_error($ch);$result['network_error']=$out===false||$result['error']!=='';curl_close($ch);$result['body']=$out?:'';}else{$ctx=stream_context_create(['http'=>['method'=>'POST','header'=>"Accept: application/json\r\nContent-Type: application/x-www-form-urlencoded\r\n",'content'=>$body,'timeout'=>35,'ignore_errors'=>true],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);$out=@file_get_contents($this->providerUrl,false,$ctx);$result['body']=$out?:'';$result['network_error']=$out===false;$line=$http_response_header[0]??'';if(preg_match('/\s(\d{3})\s/',$line,$m))$result['status']=(int)$m[1];if($out===false)$result['error']='Provider network request failed';}$decoded=json_decode($result['body'],true);if(json_last_error()===JSON_ERROR_NONE)$result['json']=$decoded;$result['ok']=!$result['network_error']&&$result['status']>=200&&$result['status']<300&&is_array($decoded)&&!isset($decoded['error']);return $result; }
    private function fail($message, $code, $status) { http_response_code($status); return ['success'=>false,'error'=>$message,'code'=>$code]; }
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') bb_fail('POST action=place_order is required.', 405);
    $input = $_POST; if (!$input) { $decoded=json_decode(file_get_contents('php://input'),true); if(is_array($decoded))$input=$decoded; }
    if (($input['action'] ?? '') !== 'place_order') bb_fail('Invalid action.',400);
    $claims = bb_require_firebase_user();
    unset($input['user_id'],$input['user_balance'],$input['rate_bdt'],$input['service_name'],$input['price']);
    if (empty($input['request_id'])) $input['request_id'] = $_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? '';
    bb_json((new BoostBanglaOrderHandler())->place($input, $claims['user_id']));
} catch (Throwable $error) {
    error_log('BoostBangla secure order handler fatal: ' . $error->getMessage());
    bb_fail('Order handler error. Please try again or contact support.', 500, ['code'=>'ORDER_HANDLER_FATAL']);
}
