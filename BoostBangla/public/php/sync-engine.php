<?php
// ============================================
// Sync Engine - AmarBoost Order Status Sync
// Keeps local orders synced with AmarBoost status
// BoostBangla Middleman System
// ============================================

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/config.php';

if (!class_exists('APIProxyLogger')) {
    class APIProxyLogger {
        public static function getInstance() { return new self(); }
        public function info($message, $context = []) { error_log('[info] ' . $message . ' ' . json_encode($context)); }
        public function warning($message, $context = []) { error_log('[warning] ' . $message . ' ' . json_encode($context)); }
        public function error($message, $context = []) { error_log('[error] ' . $message . ' ' . json_encode($context)); }
    }
}

class SyncEngine {
    private $db;
    private $logger;
    private $amarboostKey;

    const AMARBOOST_API = 'https://amarboost.com/api/v2';
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5; // minutes

    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = APIProxyLogger::getInstance();
        $this->amarboostKey = defined('AMARBOOST_API_KEY') ? AMARBOOST_API_KEY : '';
    }

    /**
     * Sync all pending orders with AmarBoost
     */
    public function syncPendingOrders() {
        try {
            $this->logger->info("🔄 Starting order sync...");

            // Get all orders that need syncing
            $orders = $this->db->getRows(
                "SELECT * FROM orders WHERE sync_status = 'pending' AND retry_count < ? ORDER BY created_at ASC LIMIT 100",
                'i',
                [self::MAX_RETRIES]
            );

            if (empty($orders)) {
                $this->logger->info("✅ No orders to sync");
                return ['synced' => 0, 'failed' => 0];
            }

            $stats = ['synced' => 0, 'failed' => 0];

            foreach ($orders as $order) {
                if ($this->syncOrder($order)) {
                    $stats['synced']++;
                } else {
                    $stats['failed']++;
                }
            }

            $this->logger->info("✅ Sync completed", $stats);
            return $stats;

        } catch (Exception $e) {
            $this->logger->error("Sync engine error: " . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Sync single order status
     */
    public function syncOrder($order) {
        try {
            if (empty($order['amarboost_order_id'])) {
                $this->logger->warning("Order has no AmarBoost ID", ['order_id' => $order['id']]);
                return false;
            }

            // Get status from AmarBoost
            $status = $this->getOrderStatusFromAmarBoost($order['amarboost_order_id']);

            if (!$status) {
                $this->incrementRetry($order['id']);
                return false;
            }

            // Update local order with new status
            $this->updateOrderFromAmarBoost($order['id'], $status);

            // Mark as synced
            $this->db->update(
                "UPDATE orders SET sync_status = 'synced', last_sync = NOW() WHERE id = ?",
                'i',
                [$order['id']]
            );

            $this->logSyncSuccess($order['id'], 'status', $status);
            $this->logger->info("✅ Order synced", ['order_id' => $order['id'], 'status' => $status]);

            return true;

        } catch (Exception $e) {
            $this->logger->error("Order sync failed", ['order_id' => $order['id'], 'error' => $e->getMessage()]);
            $this->incrementRetry($order['id']);
            return false;
        }
    }

    /**
     * Get order status from AmarBoost
     */
    private function getOrderStatusFromAmarBoost($amarboostOrderId) {
        try {
            $payload = [
                'key' => $this->amarboostKey,
                'action' => 'status',
                'order' => $amarboostOrderId
            ];

            $response = $this->callAmarBoostAPI($payload);

            if (!$response) {
                return null;
            }

            return $response['status'] ?? 'unknown';

        } catch (Exception $e) {
            $this->logger->error("Failed to get status from AmarBoost", ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Update local order from AmarBoost data
     */
    private function updateOrderFromAmarBoost($orderId, $amarboostStatus) {
        // Map AmarBoost status to local status
        $statusMap = [
            'Pending' => 'pending',
            'Processing' => 'processing',
            'In Progress' => 'in_progress',
            'Completed' => 'completed',
            'Partial' => 'in_progress',
            'Cancelled' => 'cancelled',
            'Refunded' => 'cancelled'
        ];

        $localStatus = $statusMap[$amarboostStatus] ?? 'in_progress';

        $this->db->update(
            "UPDATE orders SET amarboost_status = ?, status = ?, updated_at = NOW() WHERE id = ?",
            'ssi',
            [$amarboostStatus, $localStatus, $orderId]
        );
    }

    /**
     * Increment retry count
     */
    private function incrementRetry($orderId) {
        $this->db->update(
            "UPDATE order_sync_log SET retry_count = retry_count + 1 WHERE order_id = ? AND action = 'status'",
            'i',
            [$orderId]
        );
    }

    /**
     * Handle order refund/cancellation
     */
    public function handleOrderCancellation($orderId) {
        try {
            $order = $this->db->getRow("SELECT * FROM orders WHERE id = ?", 'i', [$orderId]);

            if (!$order || !$order['amarboost_order_id']) {
                throw new Exception('Order not found or not synced with AmarBoost');
            }

            // Request cancellation from AmarBoost
            $payload = [
                'key' => $this->amarboostKey,
                'action' => 'cancel',
                'orders' => $order['amarboost_order_id']
            ];

            $response = $this->callAmarBoostAPI($payload);

            if ($response) {
                // Refund user
                $this->refundOrderBalance($order);

                // Update order status
                $this->db->update(
                    "UPDATE orders SET status = 'cancelled', amarboost_status = 'Cancelled' WHERE id = ?",
                    'i',
                    [$orderId]
                );

                // Log cancellation
                $this->logSyncSuccess($orderId, 'cancel', $response);
                $this->logger->info("✅ Order cancelled and refunded", ['order_id' => $orderId]);

                return true;
            }

            return false;

        } catch (Exception $e) {
            $this->logger->error("Cancellation failed", ['order_id' => $orderId, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Refund order balance to user
     */
    private function refundOrderBalance($order) {
        $user = $this->db->getRow(
            "SELECT balance FROM user_wallets WHERE user_id = ?",
            's',
            [$order['user_id']]
        );

        $newBalance = $user['balance'] + $order['user_price'];

        $this->db->update(
            "UPDATE user_wallets SET balance = ?, total_refunded = total_refunded + ? WHERE user_id = ?",
            'dds',
            [$newBalance, $order['user_price'], $order['user_id']]
        );

        // Log refund transaction
        $this->db->insert(
            "INSERT INTO order_transactions (user_id, transaction_type, amount, balance_before, balance_after, description)
             VALUES (?, ?, ?, ?, ?, ?)",
            'ssddds',
            [$order['user_id'], 'refund', $order['user_price'], $user['balance'], $newBalance, 'Order #' . $order['id'] . ' refunded']
        );
    }

    /**
     * Cache services from AmarBoost
     */
    public function cacheServices($services) {
        try {
            $this->logger->info("💾 Caching services from AmarBoost...");

            foreach ($services as $service) {
                $baseRate = floatval($service['rate'] ?? 0);
                $userPrice = $baseRate;
                $amarboostCost = $baseRate / 1.30; // 30% markup

                $this->db->execute(
                    "INSERT INTO services_cache (
                        service_id, service_name, category, base_rate,
                        user_price, amarboost_price, markup_percent,
                        min_order, max_order, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        service_name = VALUES(service_name),
                        category = VALUES(category),
                        base_rate = VALUES(base_rate),
                        user_price = VALUES(user_price),
                        amarboost_price = VALUES(amarboost_price),
                        is_active = VALUES(is_active),
                        updated_at = NOW()",
                    'issdddiii',
                    [
                        $service['service'] ?? 0,
                        $service['name'] ?? '',
                        $service['category'] ?? '',
                        $baseRate,
                        $userPrice,
                        $amarboostCost,
                        30,
                        $service['min'] ?? 1,
                        $service['max'] ?? 100000,
                        1
                    ]
                );
            }

            $this->logger->info("✅ Services cached successfully");
            return true;

        } catch (Exception $e) {
            $this->logger->error("Service caching failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Generate daily profit summary
     */
    public function generateDailySummary($date = null) {
        try {
            $date = $date ?? date('Y-m-d');

            $this->logger->info("📊 Generating profit summary for $date");

            // Get all completed orders for the day
            $stats = $this->db->getRow(
                "SELECT
                    COUNT(*) as total_orders,
                    SUM(user_price) as total_user_revenue,
                    SUM(amarboost_price / 1.30) as total_amarboost_cost,
                    SUM(profit) as total_profit,
                    AVG(((profit / (profit + (amarboost_price / 1.30))) * 100)) as avg_markup_percent
                FROM orders
                WHERE DATE(created_at) = ? AND status IN ('completed', 'in_progress')",
                's',
                [$date]
            );

            if ($stats['total_orders'] > 0) {
                $this->db->execute(
                    "INSERT INTO profit_summary (
                        date, total_orders, total_user_revenue,
                        total_amarboost_cost, total_profit, average_markup_percent
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        total_orders = VALUES(total_orders),
                        total_user_revenue = VALUES(total_user_revenue),
                        total_amarboost_cost = VALUES(total_amarboost_cost),
                        total_profit = VALUES(total_profit),
                        average_markup_percent = VALUES(average_markup_percent)",
                    'siddddd',
                    [
                        $date,
                        $stats['total_orders'],
                        $stats['total_user_revenue'],
                        $stats['total_amarboost_cost'],
                        $stats['total_profit'],
                        $stats['avg_markup_percent']
                    ]
                );

                $this->logger->info("✅ Summary generated", [
                    'date' => $date,
                    'orders' => $stats['total_orders'],
                    'profit' => $stats['total_profit']
                ]);
            }

            return $stats;

        } catch (Exception $e) {
            $this->logger->error("Summary generation failed: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Call AmarBoost API
     */
    private function callAmarBoostAPI($payload, $endpoint = '') {
        try {
            unset($payload['api_key']);
            $payload['key'] = $payload['key'] ?? $this->amarboostKey;
            $lastError = 'Unknown AmarBoost error';
            for ($attempt = 1; $attempt <= 3; $attempt++) {
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => self::AMARBOOST_API . $endpoint,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => http_build_query($payload),
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_SSL_VERIFYHOST => 2,
                    CURLOPT_USERAGENT => 'BoostBangla-SyncEngine/3.0 (+https://boostbangla.com)',
                    CURLOPT_HTTPHEADER => [
                        'Accept: application/json',
                        'Content-Type: application/x-www-form-urlencoded'
                    ]
                ]);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                curl_close($ch);

                if ($curlError) {
                    $lastError = $curlError;
                } elseif ($httpCode < 200 || $httpCode >= 300) {
                    $lastError = "HTTP $httpCode";
                } else {
                    $decoded = json_decode($response, true);
                    if (json_last_error() === JSON_ERROR_NONE && !isset($decoded['error'])) {
                        return $decoded;
                    }
                    $lastError = json_last_error() === JSON_ERROR_NONE
                        ? (is_string($decoded['error']) ? $decoded['error'] : json_encode($decoded['error']))
                        : json_last_error_msg();
                }

                if ($attempt < 3) {
                    usleep((int)(pow(2, $attempt - 1) * 250000));
                }
            }

            throw new Exception("API error: $lastError");

        } catch (Exception $e) {
            $this->logger->error("API call failed: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Log sync result
     */
    private function logSyncSuccess($orderId, $action, $response) {
        $this->db->insert(
            "INSERT INTO order_sync_log (order_id, action, response_data, status) VALUES (?, ?, ?, ?)",
            'isss',
            [$orderId, $action, json_encode($response), 'success']
        );
    }
}

// Handle CLI commands for cron jobs
if (php_sapi_name() === 'cli') {
    $engine = new SyncEngine();

    if ($argc > 1) {
        switch ($argv[1]) {
            case 'sync':
                $engine->syncPendingOrders();
                break;
            case 'summary':
                $date = $argv[2] ?? null;
                $engine->generateDailySummary($date);
                break;
            default:
                echo "Usage: php sync-engine.php [sync|summary] [date]\n";
        }
    }
}
?>
