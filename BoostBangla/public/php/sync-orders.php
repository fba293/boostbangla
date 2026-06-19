<?php
// ============================================
// BoostBangla Order Status Sync Script - Premium Design System v3.0
// Advanced cron job with multi-provider support, retry logic, and webhooks
// Version: 3.0
// ============================================

// ============================================
// Configuration
// ============================================

// Error reporting for cron jobs
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// Timezone
date_default_timezone_set('Asia/Dhaka');

// Database Configuration (Firebase via REST API)
define('FIREBASE_PROJECT_ID', 'boostbangla-629a1');
define('FIREBASE_API_KEY', 'AIzaSyDypaa-pHjEc4rrXHrtj8i_8vgo_5XMY9g');
define('FIREBASE_DB_URL', 'https://boostbangla-629a1-default-rtdb.firebaseio.com');

// API Provider Configuration
define('AMARBOOST_API_URL', 'https://amarboost.com/api/v2');
define('AMARBOOST_API_KEY', 'b16011ef550d30af27e306d128747cee');

define('SMMSUN_API_URL', 'https://smmsun.com/api/v2');
define('SMMSUN_API_KEY', 'eb1ee371938ee0c485a2dd61f5906fa4');

define('QUICKPANELY_API_URL', 'https://quickpanely.com/api/v2');
define('QUICKPANELY_API_KEY', 'b26a4bdc07432d7fcbce9fa2153a2a9f');

// Sync Configuration
define('BATCH_SIZE', 50);
define('MAX_RETRIES', 3);
define('RETRY_DELAY', 300); // 5 minutes
define('WEBHOOK_ENABLED', true);
define('WEBHOOK_URL', 'https://your-server.com/webhook/order-update');

// Logging Configuration
define('LOG_LEVEL', 'info'); // debug, info, warning, error
define('LOG_FILE', __DIR__ . '/logs/sync_' . date('Y-m-d') . '.log');
define('ERROR_LOG_FILE', __DIR__ . '/logs/sync_errors.log');

// Create logs directory if not exists
if (!file_exists(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

// ============================================
// Enhanced Logging Class
// ============================================

class SyncLogger {
    private static $instance = null;
    private $logFile;
    private $errorLogFile;
    private $logLevels = [
        'debug' => 0,
        'info' => 1,
        'warning' => 2,
        'error' => 3
    ];
    
    private function __construct() {
        $this->logFile = LOG_FILE;
        $this->errorLogFile = ERROR_LOG_FILE;
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function log($message, $level = 'info', $context = []) {
        $currentLevel = $this->logLevels[LOG_LEVEL] ?? 1;
        $messageLevel = $this->logLevels[$level] ?? 1;
        
        if ($messageLevel < $currentLevel) {
            return;
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
        $logMessage = "[$timestamp] [$level] $message$contextStr\n";
        
        file_put_contents($this->logFile, $logMessage, FILE_APPEND);
        
        if ($level === 'error') {
            file_put_contents($this->errorLogFile, $logMessage, FILE_APPEND);
        }
        
        // Also output to console if running from CLI
        if (php_sapi_name() === 'cli') {
            echo $logMessage;
        }
    }
    
    public function info($message, $context = []) {
        $this->log($message, 'info', $context);
    }
    
    public function warning($message, $context = []) {
        $this->log($message, 'warning', $context);
    }
    
    public function error($message, $context = []) {
        $this->log($message, 'error', $context);
    }
    
    public function debug($message, $context = []) {
        $this->log($message, 'debug', $context);
    }
}

$logger = SyncLogger::getInstance();

// ============================================
// Enhanced Order Status Class
// ============================================

class OrderStatusSync {
    private $logger;
    private $providerClients = [];
    private $stats = [
        'total_processed' => 0,
        'updated' => 0,
        'failed' => 0,
        'skipped' => 0,
        'by_status' => [
            'pending' => 0,
            'processing' => 0,
            'completed' => 0,
            'partial' => 0,
            'cancelled' => 0
        ],
        'start_time' => null,
        'end_time' => null
    ];
    
    public function __construct($logger) {
        $this->logger = $logger;
        $this->initProviderClients();
        $this->stats['start_time'] = microtime(true);
    }
    
    private function initProviderClients() {
        $this->providerClients = [
            'amarboost' => [
                'url' => AMARBOOST_API_URL,
                'key' => AMARBOOST_API_KEY
            ],
            'smmsun' => [
                'url' => SMMSUN_API_URL,
                'key' => SMMSUN_API_KEY
            ],
            'quickpanely' => [
                'url' => QUICKPANELY_API_URL,
                'key' => QUICKPANELY_API_KEY
            ]
        ];
    }
    
    /**
     * Fetch pending orders from Firebase Firestore
     */
    public function fetchPendingOrders($limit = BATCH_SIZE, $status = 'pending') {
        $this->logger->info("Fetching $status orders from Firebase", ['limit' => $limit]);
        
        try {
            // Using Firebase REST API to query Firestore
            $url = sprintf(
                'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/orders',
                FIREBASE_PROJECT_ID
            );
            
            // Build query for pending orders
            $query = [
                'structuredQuery' => [
                    'where' => [
                        'fieldFilter' => [
                            'field' => ['fieldPath' => 'status'],
                            'op' => 'EQUAL',
                            'value' => ['stringValue' => $status]
                        ]
                    ],
                    'limit' => $limit,
                    'orderBy' => [
                        ['field' => ['fieldPath' => 'createdAt'], 'direction' => 'ASCENDING']
                    ]
                ]
            ];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?key=' . FIREBASE_API_KEY);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($query));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            if ($curlError) {
                throw new Exception("CURL Error: $curlError");
            }
            
            if ($httpCode !== 200) {
                throw new Exception("HTTP Error: $httpCode - $response");
            }
            
            $data = json_decode($response, true);
            $orders = [];
            
            if (isset($data['documents'])) {
                foreach ($data['documents'] as $doc) {
                    $pathParts = explode('/', $doc['name']);
                    $docId = end($pathParts);
                    
                    $fields = $doc['fields'];
                    $orders[] = [
                        'id' => $docId,
                        'provider_order_id' => $fields['provider_order_id']['stringValue'] ?? null,
                        'provider' => $fields['provider']['stringValue'] ?? 'amarboost',
                        'service_id' => $fields['service_id']['stringValue'] ?? $fields['service_id']['integerValue'] ?? null,
                        'quantity' => $fields['quantity']['integerValue'] ?? 0,
                        'link' => $fields['link']['stringValue'] ?? '',
                        'status' => $fields['status']['stringValue'] ?? 'pending',
                        'created_at' => $fields['createdAt']['stringValue'] ?? date('c'),
                        'retry_count' => $fields['retry_count']['integerValue'] ?? 0
                    ];
                }
            }
            
            $this->logger->info("Fetched " . count($orders) . " $status orders");
            return $orders;
            
        } catch (Exception $e) {
            $this->logger->error("Failed to fetch orders: " . $e->getMessage());
            
            // Fallback to mock data for testing
            if (php_sapi_name() === 'cli' && getenv('APP_ENV') === 'development') {
                $this->logger->warning("Using mock data for development");
                return $this->getMockOrders($limit);
            }
            
            return [];
        }
    }
    
    /**
     * Mock orders for development/testing
     */
    private function getMockOrders($limit) {
        return [
            [
                'id' => 'mock_order_1',
                'provider_order_id' => '12345',
                'provider' => 'amarboost',
                'service_id' => '6205',
                'quantity' => 1000,
                'link' => 'https://youtube.com/watch?v=test',
                'status' => 'pending',
                'created_at' => date('c'),
                'retry_count' => 0
            ]
        ];
    }
    
    /**
     * Check order status from provider API
     */
    public function checkOrderStatus($order) {
        $provider = $order['provider'];
        $providerOrderId = $order['provider_order_id'];
        
        if (!$providerOrderId) {
            $this->logger->warning("No provider order ID for order: {$order['id']}");
            return null;
        }
        
        $client = $this->providerClients[$provider] ?? $this->providerClients['amarboost'];
        
        $url = $client['url'];
        $params = [
            'key' => $client['key'],
            'action' => 'status',
            'order' => $providerOrderId
        ];
        
        $this->logger->debug("Checking status for order {$order['id']}", [
            'provider' => $provider,
            'provider_order_id' => $providerOrderId
        ]);
        
        try {
            $result = $this->makeApiCall($url, $params, 'GET');
            
            if ($result && isset($result['status'])) {
                return $this->mapProviderStatus($result['status'], $result);
            }
            
            return null;
            
        } catch (Exception $e) {
            $this->logger->error("Status check failed for order {$order['id']}: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Map provider status to BoostBangla status
     */
    private function mapProviderStatus($providerStatus, $fullResponse = []) {
        $statusMap = [
            'pending' => 'pending',
            'processing' => 'processing',
            'inprogress' => 'processing',
            'completed' => 'completed',
            'partial' => 'partial',
            'cancelled' => 'cancelled',
            'error' => 'failed',
            'refunded' => 'refunded'
        ];
        
        $mappedStatus = $statusMap[strtolower($providerStatus)] ?? 'pending';
        
        $additionalData = [];
        if ($mappedStatus === 'partial' && isset($fullResponse['start_count'])) {
            $additionalData['start_count'] = $fullResponse['start_count'];
            $additionalData['remains'] = $fullResponse['remains'] ?? 0;
        }
        
        if ($mappedStatus === 'completed' && isset($fullResponse['charged'])) {
            $additionalData['amount_charged'] = $fullResponse['charged'];
        }
        
        return [
            'status' => $mappedStatus,
            'provider_status' => $providerStatus,
            'additional_data' => $additionalData,
            'checked_at' => date('c')
        ];
    }
    
    /**
     * Update order status in Firebase
     */
    public function updateOrderStatus($orderId, $statusData) {
        $this->logger->info("Updating order $orderId to status: {$statusData['status']}");
        
        try {
            $url = sprintf(
                'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/orders/%s',
                FIREBASE_PROJECT_ID,
                $orderId
            );
            
            $fields = [
                'status' => ['stringValue' => $statusData['status']],
                'provider_status' => ['stringValue' => $statusData['provider_status']],
                'last_synced_at' => ['stringValue' => $statusData['checked_at']],
                'updatedAt' => ['stringValue' => date('c')]
            ];
            
            // Add additional data if present
            if (!empty($statusData['additional_data'])) {
                $fields['sync_data'] = ['stringValue' => json_encode($statusData['additional_data'])];
            }
            
            // Add completion timestamp
            if ($statusData['status'] === 'completed') {
                $fields['completedAt'] = ['stringValue' => date('c')];
            }
            
            $payload = ['fields' => $fields];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?key=' . FIREBASE_API_KEY);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            if ($curlError) {
                throw new Exception("CURL Error: $curlError");
            }
            
            if ($httpCode !== 200) {
                throw new Exception("HTTP Error: $httpCode - $response");
            }
            
            $this->stats['updated']++;
            $this->stats['by_status'][$statusData['status']]++;
            
            // Send webhook notification
            if (WEBHOOK_ENABLED && in_array($statusData['status'], ['completed', 'cancelled', 'partial'])) {
                $this->sendWebhookNotification($orderId, $statusData);
            }
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Failed to update order $orderId: " . $e->getMessage());
            $this->stats['failed']++;
            return false;
        }
    }
    
    /**
     * Send webhook notification for status updates
     */
    private function sendWebhookNotification($orderId, $statusData) {
        $webhookData = [
            'event' => 'order_status_updated',
            'order_id' => $orderId,
            'status' => $statusData['status'],
            'provider_status' => $statusData['provider_status'],
            'timestamp' => date('c'),
            'version' => '3.0'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, WEBHOOK_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            $this->logger->warning("Webhook failed for order $orderId, HTTP: $httpCode");
        }
    }
    
    /**
     * Update order with retry mechanism
     */
    public function updateWithRetry($order, $maxRetries = MAX_RETRIES) {
        $retryCount = 0;
        $lastError = null;
        
        while ($retryCount < $maxRetries) {
            $statusData = $this->checkOrderStatus($order);
            
            if ($statusData) {
                $success = $this->updateOrderStatus($order['id'], $statusData);
                if ($success) {
                    return true;
                }
            }
            
            $retryCount++;
            $this->logger->warning("Retry $retryCount for order {$order['id']}");
            
            if ($retryCount < $maxRetries) {
                sleep(RETRY_DELAY);
            }
        }
        
        $this->stats['failed']++;
        return false;
    }
    
    /**
     * Make API call with retry logic
     */
    private function makeApiCall($url, $params, $method = 'POST', $maxRetries = 3) {
        $attempt = 0;
        
        while ($attempt < $maxRetries) {
            $ch = curl_init();
            
            if ($method === 'POST') {
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
            } else {
                $queryString = http_build_query($params);
                curl_setopt($ch, CURLOPT_URL, $url . '?' . $queryString);
            }
            
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_USERAGENT, 'BoostBangla-Sync/3.0');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded'
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            if (!$curlError && $httpCode === 200) {
                $decoded = json_decode($response, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $decoded;
                }
            }
            
            $attempt++;
            if ($attempt < $maxRetries) {
                sleep(2);
            }
        }
        
        return null;
    }
    
    /**
     * Run the sync process
     */
    public function run() {
        $this->logger->info("========================================");
        $this->logger->info("BoostBangla Order Status Sync v3.0 Started");
        $this->logger->info("========================================");
        
        // Fetch pending orders
        $pendingOrders = $this->fetchPendingOrders(BATCH_SIZE, 'pending');
        $processingOrders = $this->fetchPendingOrders(BATCH_SIZE, 'processing');
        
        $allOrders = array_merge($pendingOrders, $processingOrders);
        $this->stats['total_processed'] = count($allOrders);
        
        $this->logger->info("Processing " . count($allOrders) . " orders");
        
        foreach ($allOrders as $order) {
            $this->processSingleOrder($order);
        }
        
        $this->stats['end_time'] = microtime(true);
        $this->printSummary();
        
        return $this->stats;
    }
    
    /**
     * Process a single order
     */
    private function processSingleOrder($order) {
        $this->logger->debug("Processing order: {$order['id']}", [
            'status' => $order['status'],
            'provider' => $order['provider']
        ]);
        
        // Skip if max retries exceeded
        if ($order['retry_count'] >= MAX_RETRIES) {
            $this->logger->warning("Order {$order['id']} exceeded max retries");
            $this->stats['skipped']++;
            return;
        }
        
        $success = $this->updateWithRetry($order);
        
        if (!$success) {
            // Increment retry count
            $this->incrementRetryCount($order['id'], $order['retry_count']);
            $this->stats['failed']++;
        }
    }
    
    /**
     * Increment retry count for failed order
     */
    private function incrementRetryCount($orderId, $currentRetry) {
        try {
            $url = sprintf(
                'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/orders/%s',
                FIREBASE_PROJECT_ID,
                $orderId
            );
            
            $payload = [
                'fields' => [
                    'retry_count' => ['integerValue' => $currentRetry + 1],
                    'last_sync_error' => ['stringValue' => date('c')]
                ]
            ];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?key=' . FIREBASE_API_KEY);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            curl_exec($ch);
            curl_close($ch);
            
        } catch (Exception $e) {
            $this->logger->error("Failed to update retry count for $orderId");
        }
    }
    
    /**
     * Print sync summary
     */
    private function printSummary() {
        $duration = round(($this->stats['end_time'] - $this->stats['start_time']), 2);
        
        $summary = "
========================================
BoostBangla Sync Summary v3.0
========================================
Total Processed: {$this->stats['total_processed']}
Updated: {$this->stats['updated']}
Failed: {$this->stats['failed']}
Skipped: {$this->stats['skipped']}
Duration: {$duration} seconds

Status Breakdown:
- Completed: {$this->stats['by_status']['completed']}
- Processing: {$this->stats['by_status']['processing']}
- Partial: {$this->stats['by_status']['partial']}
- Cancelled: {$this->stats['by_status']['cancelled']}
- Pending: {$this->stats['by_status']['pending']}
========================================
";
        
        $this->logger->info($summary);
        
        // Send to external monitoring if enabled
        if (defined('MONITORING_ENABLED') && MONITORING_ENABLED) {
            $this->sendMonitoringData();
        }
    }
    
    /**
     * Send monitoring data to external service
     */
    private function sendMonitoringData() {
        $data = [
            'timestamp' => date('c'),
            'stats' => $this->stats,
            'server' => gethostname(),
            'version' => '3.0'
        ];
        
        // Implement your monitoring service integration here
        // Example: send to DataDog, Prometheus, or custom endpoint
    }
}

// ============================================
// Main Execution
// ============================================

// Check if running from CLI or webhook
$isCli = php_sapi_name() === 'cli';
$isWebhook = isset($_GET['webhook']) && $_GET['webhook'] === 'true';

if ($isCli || $isWebhook) {
    // Set execution time limit for long-running sync
    set_time_limit(0);
    
    $sync = new OrderStatusSync($logger);
    $stats = $sync->run();
    
    // Output result as JSON for webhook
    if ($isWebhook) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'stats' => $stats,
            'timestamp' => date('c'),
            'version' => '3.0'
        ]);
    }
    
    // Exit with appropriate code
    exit($stats['failed'] > 0 ? 1 : 0);
} else {
    // If accessed via browser, show status page
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
        <title>BoostBangla Order Sync v3.0</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #02101A 0%, #031a2a 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .sync-card {
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 32px;
                padding: 40px;
                max-width: 500px;
                width: 100%;
                border: 1px solid rgba(255, 107, 0, 0.3);
                box-shadow: 0 35px 45px -15px rgba(0, 0, 0, 0.4);
            }
            
            .sync-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #FF6B00, #CC5500);
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                animation: float 3s ease-in-out infinite;
            }
            
            .sync-icon i {
                font-size: 40px;
                color: white;
            }
            
            h1 {
                color: white;
                font-size: 28px;
                font-weight: 800;
                text-align: center;
                margin-bottom: 8px;
            }
            
            .version {
                text-align: center;
                color: #FF6B00;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 32px;
                letter-spacing: 1px;
            }
            
            .status-card {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 20px;
                padding: 20px;
                margin-bottom: 24px;
            }
            
            .status-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .status-row:last-child {
                border-bottom: none;
            }
            
            .status-label {
                color: #94a3b8;
                font-weight: 500;
            }
            
            .status-value {
                color: white;
                font-weight: 700;
            }
            
            .status-value.pending { color: #f59e0b; }
            .status-value.processing { color: #3b82f6; }
            .status-value.completed { color: #10b981; }
            .status-value.cancelled { color: #ef4444; }
            
            .sync-btn {
                width: 100%;
                background: linear-gradient(135deg, #FF6B00, #CC5500);
                border: none;
                padding: 16px;
                border-radius: 60px;
                color: white;
                font-weight: 700;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-bottom: 16px;
            }
            
            .sync-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 28px -8px rgba(255, 107, 0, 0.5);
            }
            
            .info-text {
                text-align: center;
                color: #64748b;
                font-size: 12px;
                margin-top: 24px;
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
            }
            
            @media (max-width: 640px) {
                .sync-card {
                    padding: 24px;
                }
                h1 {
                    font-size: 24px;
                }
                .sync-icon {
                    width: 60px;
                    height: 60px;
                }
                .sync-icon i {
                    font-size: 30px;
                }
            }
        </style>
    </head>
    <body>
        <div class="sync-card">
            <div class="sync-icon">
                <i>🔄</i>
            </div>
            <h1>Order Status Sync</h1>
            <div class="version">v3.0 - Premium Design System</div>
            
            <div class="status-card">
                <div class="status-row">
                    <span class="status-label">📊 Status</span>
                    <span class="status-value" id="syncStatus">Idle</span>
                </div>
                <div class="status-row">
                    <span class="status-label">🕐 Last Sync</span>
                    <span class="status-value" id="lastSync">Not run yet</span>
                </div>
                <div class="status-row">
                    <span class="status-label">✅ Orders Updated</span>
                    <span class="status-value" id="updatedCount">0</span>
                </div>
                <div class="status-row">
                    <span class="status-label">❌ Failed</span>
                    <span class="status-value" id="failedCount">0</span>
                </div>
            </div>
            
            <button class="sync-btn" onclick="runSync()">
                🔄 Run Manual Sync
            </button>
            
            <div class="info-text">
                ⚡ This script is automatically executed via cron job every 5 minutes.<br>
                Manual sync can be triggered using the button above.
            </div>
        </div>
        
        <script>
            async function runSync() {
                const btn = document.querySelector('.sync-btn');
                const syncStatus = document.getElementById('syncStatus');
                const lastSync = document.getElementById('lastSync');
                
                btn.disabled = true;
                btn.innerHTML = '<i>⏳</i> Syncing...';
                syncStatus.innerHTML = 'Running...';
                syncStatus.style.color = '#f59e0b';
                
                try {
                    const response = await fetch(window.location.href + '?webhook=true', {
                        method: 'GET',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        syncStatus.innerHTML = 'Completed';
                        syncStatus.style.color = '#10b981';
                        lastSync.innerHTML = new Date().toLocaleString();
                        document.getElementById('updatedCount').innerHTML = data.stats.updated;
                        document.getElementById('failedCount').innerHTML = data.stats.failed;
                    } else {
                        syncStatus.innerHTML = 'Failed';
                        syncStatus.style.color = '#ef4444';
                    }
                } catch (error) {
                    syncStatus.innerHTML = 'Error';
                    syncStatus.style.color = '#ef4444';
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '🔄 Run Manual Sync';
                    setTimeout(() => {
                        if (syncStatus.innerHTML !== 'Idle') {
                            syncStatus.innerHTML = 'Idle';
                            syncStatus.style.color = 'white';
                        }
                    }, 3000);
                }
            }
            
            // Auto-refresh stats every 30 seconds
            setInterval(async () => {
                try {
                    const response = await fetch(window.location.href + '?stats=true');
                    const data = await response.json();
                    if (data.stats) {
                        document.getElementById('updatedCount').innerHTML = data.stats.updated;
                        document.getElementById('failedCount').innerHTML = data.stats.failed;
                    }
                } catch (e) {}
            }, 30000);
        </script>
    </body>
    </html>
    <?php
}
?>