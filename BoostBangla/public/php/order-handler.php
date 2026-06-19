<?php
// ============================================
// Order Handler - Core Order Processing
// Intercepts user orders and forwards to AmarBoost
// BoostBangla Middleman System
// ============================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/config.php';

if (!is_dir(__DIR__ . '/logs')) {
    @mkdir(__DIR__ . '/logs', 0755, true);
}

if (!class_exists('APIProxyLogger')) {
    class APIProxyLogger {
        public static function getInstance() { return new self(); }
        public function info($message, $context = []) { error_log('[info] ' . $message . ' ' . json_encode($context)); }
        public function warning($message, $context = []) { error_log('[warning] ' . $message . ' ' . json_encode($context)); }
        public function error($message, $context = []) { error_log('[error] ' . $message . ' ' . json_encode($context)); }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class OrderHandler {
    private $db;
    private $logger;
    private $amarboostKey;
    private $lastAmarBoostError = '';

    const MARKUP_PERCENT = 30;
    const AMARBOOST_API = 'https://amarboost.com/api/v2';

    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = APIProxyLogger::getInstance();
        $this->amarboostKey = defined('AMARBOOST_API_KEY') ? AMARBOOST_API_KEY : '';
    }

    /**
     * Main entry point - Place order
     */
    public function placeOrder($data) {
        try {
            // Validate input
            $this->validateOrderData($data);

            // Start transaction
            $this->db->beginTransaction();

            // Get service info
            $service = $this->getServiceInfo($data['service_id'], $data);
            if (!$service) {
                throw new Exception('Service not found');
            }

            // Calculate prices
            $pricing = $this->calculatePricing($service, $data['quantity']);

            // Validate user balance
            $user = $this->getOrCreateUser($data['user_id']);
            if ($user['balance'] < $pricing['user_price'] && isset($data['user_balance']) && (float)$data['user_balance'] >= $pricing['user_price']) {
                $this->db->update(
                    "UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE user_id = ?",
                    'ds',
                    [(float)$data['user_balance'], $data['user_id']]
                );
                $user['balance'] = (float)$data['user_balance'];
            }
            if ($user['balance'] < $pricing['user_price']) {
                $this->db->rollback();
                return $this->error('Insufficient balance', 'INSUFFICIENT_BALANCE', 402);
            }

            // Step 1: Store order locally (PENDING status)
            $localOrderId = $this->createLocalOrder($data, $service, $pricing);
            $this->logger->info("Local order created", ['local_order_id' => $localOrderId]);

            // Step 2: Deduct from user wallet
            $this->deductBalance($data['user_id'], $pricing['user_price'], 'Order #' . $localOrderId);

            // Step 3: Forward to AmarBoost
            $amarboostResult = $this->forwardToAmarBoost($data, $service);

            if (!$amarboostResult || !isset($amarboostResult['order'])) {
                // AmarBoost failed - refund user
                $this->refundBalance($data['user_id'], $pricing['user_price'], 'Order #' . $localOrderId . ' - AmarBoost forwarding failed');

                // Mark local order as failed
                $this->updateOrderStatus($localOrderId, 'failed');
                $this->logSyncFailure($localOrderId, 'add', $amarboostResult, 'Failed to forward to AmarBoost');

                $this->db->rollback();
                return $this->error($this->lastAmarBoostError ?: 'Failed to place order on AmarBoost', 'AMARBOOST_ERROR', 502);
            }

            // Step 4: Update local order with AmarBoost info
            $amarboostOrderId = $amarboostResult['order'];
            try {
                $this->linkAmarBoostOrder($localOrderId, $amarboostOrderId);
                $this->updateOrderStatus($localOrderId, 'processing');
                $this->logSyncSuccess($localOrderId, 'add', $amarboostResult);
            } catch (Throwable $syncError) {
                $this->logger->warning("AmarBoost order placed but local sync update failed", [
                    'local_order_id' => $localOrderId,
                    'amarboost_order_id' => $amarboostOrderId,
                    'error' => $syncError->getMessage()
                ]);
            }

            $this->db->commit();
            $this->logger->info("Order placed successfully", [
                'local_order_id' => $localOrderId,
                'amarboost_order_id' => $amarboostOrderId,
                'profit' => $pricing['profit']
            ]);

            $payload = [
                'success' => true,
                'local_order_id' => $localOrderId,
                'amarboost_order_id' => $amarboostOrderId,
                'status' => 'processing',
                'pricing' => $pricing,
                'message' => 'Order placed successfully'
            ];
            $payload['data'] = $payload;
            return $payload;

        } catch (Throwable $e) {
            try {
                $this->db->rollback();
            } catch (Throwable $rollbackError) {
                $this->logger->warning("Rollback failed", ['error' => $rollbackError->getMessage()]);
            }
            $this->logger->error("Order placement failed", ['error' => $e->getMessage()]);
            return $this->error($e->getMessage(), 'ORDER_ERROR');
        }
    }

    /**
     * Validate order data
     */
    private function validateOrderData($data) {
        if (empty($data['user_id'])) throw new Exception('User ID required');
        if (empty($data['service_id'])) throw new Exception('Service ID required');
        if (empty($data['link'])) throw new Exception('Link required');
        if (empty($data['quantity']) || $data['quantity'] < 1) throw new Exception('Valid quantity required');

        $data['quantity'] = (int)$data['quantity'];
    }

    /**
     * Get service info from cache or AmarBoost
     */
    private function getServiceInfo($serviceId, $data = []) {
        // Try to get from cache first
        $cached = $this->db->getRow(
            "SELECT * FROM services_cache WHERE service_id = ?",
            'i',
            [$serviceId]
        );

        if ($cached) {
            return $cached;
        }

        if (!empty($data['service_name']) && isset($data['rate_bdt'])) {
            return [
                'service_id' => (int)$serviceId,
                'service_name' => $data['service_name'],
                'base_rate' => (float)$data['rate_bdt']
            ];
        }

        return null;
    }

    /**
     * Calculate pricing with markup
     */
    private function calculatePricing($service, $quantity) {
        $baseRate = floatval($service['base_rate']);
        $amarboostPrice = ($baseRate / 1000) * $quantity;
        $userPrice = $amarboostPrice; // Show same price (hidden markup)
        $amarboostCost = $amarboostPrice / (1 + (self::MARKUP_PERCENT / 100));
        $profit = $userPrice - $amarboostCost;

        return [
            'base_rate' => $baseRate,
            'amarboost_price' => round($amarboostPrice, 4),
            'user_price' => round($userPrice, 4),
            'amarboost_cost' => round($amarboostCost, 4),
            'profit' => round($profit, 4),
            'markup_percent' => self::MARKUP_PERCENT
        ];
    }

    /**
     * Get or create user wallet
     */
    private function getOrCreateUser($userId) {
        $user = $this->db->getRow(
            "SELECT * FROM user_wallets WHERE user_id = ?",
            's',
            [$userId]
        );

        if (!$user) {
            // Create new wallet
            $this->db->insert(
                "INSERT INTO user_wallets (user_id, balance) VALUES (?, ?)",
                'sd',
                [$userId, 0]
            );
            $user = ['user_id' => $userId, 'balance' => 0];
        }

        return $user;
    }

    /**
     * Create order locally
     */
    private function createLocalOrder($data, $service, $pricing) {
        $orderId = $this->db->insert(
            "INSERT INTO orders (
                user_id, service_id, service_name, link, quantity,
                base_rate, user_price, amarboost_price, profit,
                status, local_status, sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            'sissiddddsss',
            [
                $data['user_id'],
                $data['service_id'],
                $service['service_name'],
                $data['link'],
                $data['quantity'],
                $pricing['base_rate'],
                $pricing['user_price'],
                $pricing['amarboost_price'],
                $pricing['profit'],
                'pending',
                'pending',
                'pending'
            ]
        );

        return $orderId;
    }

    /**
     * Deduct from user balance
     */
    private function deductBalance($userId, $amount, $description) {
        $user = $this->db->getRow(
            "SELECT balance FROM user_wallets WHERE user_id = ?",
            's',
            [$userId]
        );

        $newBalance = $user['balance'] - $amount;

        $this->db->update(
            "UPDATE user_wallets SET balance = ? WHERE user_id = ?",
            'ds',
            [$newBalance, $userId]
        );

        // Log transaction
        $this->db->insert(
            "INSERT INTO order_transactions (user_id, transaction_type, amount, balance_before, balance_after, description)
             VALUES (?, ?, ?, ?, ?, ?)",
            'ssddds',
            [$userId, 'debit', $amount, $user['balance'], $newBalance, $description]
        );
    }

    /**
     * Refund balance
     */
    private function refundBalance($userId, $amount, $description) {
        $user = $this->db->getRow(
            "SELECT balance FROM user_wallets WHERE user_id = ?",
            's',
            [$userId]
        );

        $newBalance = $user['balance'] + $amount;

        $this->db->update(
            "UPDATE user_wallets SET balance = ?, total_refunded = total_refunded + ? WHERE user_id = ?",
            'dds',
            [$newBalance, $amount, $userId]
        );

        // Log transaction
        $this->db->insert(
            "INSERT INTO order_transactions (user_id, transaction_type, amount, balance_before, balance_after, description)
             VALUES (?, ?, ?, ?, ?, ?)",
            'ssddds',
            [$userId, 'refund', $amount, $user['balance'], $newBalance, $description]
        );
    }

    /**
     * Forward order to AmarBoost
     */
    private function forwardToAmarBoost($data, $service) {
        try {
            $payload = [
                'key' => $this->amarboostKey,
                'action' => 'add',
                'service' => $service['service_id'],
                'link' => $data['link'],
                'quantity' => $data['quantity']
            ];

            // Add optional parameters
            if (!empty($data['custom_data'])) {
                $payload['custom_data'] = $data['custom_data'];
            }

            $lastError = 'Unknown AmarBoost error';
            for ($attempt = 1; $attempt <= 3; $attempt++) {
                $apiResponse = $this->postToAmarBoost($payload);
                $response = $apiResponse['body'];
                $httpCode = (int)$apiResponse['http_code'];
                $requestError = $apiResponse['error'];

                if ($requestError) {
                    $lastError = $requestError;
                } elseif ($httpCode < 200 || $httpCode >= 300) {
                    $lastError = "HTTP $httpCode: " . substr((string)$response, 0, 300);
                } else {
                    $decoded = json_decode($response, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        $lastError = 'Invalid JSON: ' . json_last_error_msg();
                    } elseif (isset($decoded['error'])) {
                        $lastError = is_string($decoded['error']) ? $decoded['error'] : json_encode($decoded['error']);
                    } elseif (isset($decoded['order']) || isset($decoded['order_id'])) {
                        if (!isset($decoded['order']) && isset($decoded['order_id'])) $decoded['order'] = $decoded['order_id'];
                        return $decoded;
                    } else {
                        $lastError = 'AmarBoost response did not include an order id';
                    }
                }

                if ($attempt < 3) {
                    usleep((int)(pow(2, $attempt - 1) * 250000));
                }
            }

            throw new Exception("AmarBoost API error: $lastError");

        } catch (Throwable $e) {
            $this->lastAmarBoostError = $e->getMessage();
            $this->logger->error("AmarBoost forward failed", ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function postToAmarBoost($payload) {
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => self::AMARBOOST_API,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_USERAGENT => 'BoostBangla-OrderHandler/3.0 (+https://boostbangla.com)',
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'Content-Type: application/x-www-form-urlencoded'
                ]
            ]);

            $body = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            return [
                'body' => $body,
                'http_code' => $httpCode,
                'error' => $error
            ];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Accept: application/json\r\nContent-Type: application/x-www-form-urlencoded\r\nUser-Agent: BoostBangla-OrderHandler/3.0\r\n",
                'content' => http_build_query($payload),
                'timeout' => 30,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true
            ]
        ]);

        $body = @file_get_contents(self::AMARBOOST_API, false, $context);
        $statusLine = $http_response_header[0] ?? 'HTTP/1.1 0';
        preg_match('/\s(\d{3})\s/', $statusLine, $matches);

        return [
            'body' => $body,
            'http_code' => isset($matches[1]) ? (int)$matches[1] : 0,
            'error' => $body === false ? 'HTTP stream request failed' : ''
        ];
    }

    /**
     * Link AmarBoost order ID
     */
    private function linkAmarBoostOrder($localOrderId, $amarboostOrderId) {
        $this->db->update(
            "UPDATE orders SET amarboost_order_id = ?, sync_status = 'synced' WHERE id = ?",
            'ii',
            [$amarboostOrderId, $localOrderId]
        );
    }

    /**
     * Update order status
     */
    private function updateOrderStatus($orderId, $status) {
        $this->db->update(
            "UPDATE orders SET status = ?, local_status = ?, updated_at = NOW() WHERE id = ?",
            'ssi',
            [$status, $status, $orderId]
        );
    }

    /**
     * Log successful sync
     */
    private function logSyncSuccess($orderId, $action, $response) {
        $this->db->insert(
            "INSERT INTO order_sync_log (order_id, action, response_data, status) VALUES (?, ?, ?, ?)",
            'isss',
            [$orderId, $action, json_encode($response), 'success']
        );
    }

    /**
     * Log failed sync
     */
    private function logSyncFailure($orderId, $action, $response, $errorMsg) {
        $this->db->insert(
            "INSERT INTO order_sync_log (order_id, action, response_data, status, error_message) VALUES (?, ?, ?, ?, ?)",
            'issss',
            [$orderId, $action, json_encode($response), 'failed', $errorMsg]
        );
    }

    /**
     * Format success response
     */
    private function success($data) {
        return ['success' => true, 'data' => $data];
    }

    /**
     * Format error response
     */
    private function error($message, $code = 'ERROR', $httpCode = 400) {
        http_response_code($httpCode);
        return [
            'success' => false,
            'error' => $message,
            'code' => $code
        ];
    }
}

// Handle incoming requests
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = $_POST;

        $handler = new OrderHandler();

        if (($input['action'] ?? '') === 'place_order') {
            $result = $handler->placeOrder($input);
            echo json_encode($result);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
        }
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'BoostBangla order handler is ready. Submit POST action=place_order to place an AmarBoost-backed order.'
        ]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    error_log('Order handler fatal error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Order handler error: ' . $e->getMessage(),
        'code' => 'ORDER_HANDLER_FATAL'
    ]);
}
?>
