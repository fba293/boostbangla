<?php
// ============================================
// BoostBangla Enhanced API Proxy - Premium Design System v3.0
// Multi-provider support with intelligent failover, caching, and monitoring
// Version: 3.0
// ============================================

// ============================================
// Configuration & Error Handling
// ============================================

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/api_proxy_errors.log');

date_default_timezone_set('Asia/Dhaka');

// Headers for CORS and caching
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-API-Key');
header('Cache-Control: no-cache, must-revalidate');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// Constants & Configuration
// ============================================

// API Provider Configuration
define('PROVIDERS', [
    'amarboost' => [
        'name' => 'AmarBoost',
        'url' => 'https://amarboost.com/api/v2',
        'key' => 'b16011ef550d30af27e306d128747cee',
        'priority' => 1,
        'timeout' => 30,
        'enabled' => true
    ],
    'smmsun' => [
        'name' => 'SMMSun',
        'url' => 'https://smmsun.com/api/v2',
        'key' => 'eb1ee371938ee0c485a2dd61f5906fa4',
        'priority' => 2,
        'timeout' => 30,
        'enabled' => true
    ],
    'quickpanely' => [
        'name' => 'QuickPanely',
        'url' => 'https://quickpanely.com/api/v2',
        'key' => 'b26a4bdc07432d7fcbce9fa2153a2a9f',
        'priority' => 3,
        'timeout' => 30,
        'enabled' => true
    ]
]);

// Exchange Rate Configuration
define('USD_TO_BDT', 120);
define('PROFIT_MARGIN', 1.30); // 30% markup
define('PLATFORM_FEE', 1.05); // 5% platform fee

// Cache Configuration
define('CACHE_ENABLED', true);
define('CACHE_DURATION', 300); // 5 minutes
define('CACHE_DIR', __DIR__ . '/../cache/');

// Logging Configuration
define('LOG_ENABLED', true);
define('LOG_DIR', __DIR__ . '/logs/');
define('LOG_LEVEL', 'info'); // debug, info, warning, error

// Rate Limiting
define('RATE_LIMIT_ENABLED', true);
define('RATE_LIMIT_REQUESTS', 100); // requests per minute
define('RATE_LIMIT_WINDOW', 60); // seconds

// Monitoring
define('MONITORING_ENABLED', true);
define('MONITORING_ENDPOINT', '/api/monitoring/stats');

// Create required directories
if (!file_exists(CACHE_DIR)) mkdir(CACHE_DIR, 0755, true);
if (!file_exists(LOG_DIR)) mkdir(LOG_DIR, 0755, true);

function getCurrentUsdToBdtRate() {
    $cacheFile = CACHE_DIR . 'exchange_rate_cache.json';
    if (file_exists($cacheFile)) {
        $cache = json_decode(file_get_contents($cacheFile), true);
        if (!empty($cache['rate']) && is_numeric($cache['rate'])) {
            return (float)$cache['rate'];
        }
    }
    return USD_TO_BDT;
}

// ============================================
// Logging Class
// ============================================

class APIProxyLogger {
    private static $instance = null;
    private $logFile;
    private $logLevels = ['debug' => 0, 'info' => 1, 'warning' => 2, 'error' => 3];

    private function __construct() {
        $this->logFile = LOG_DIR . 'api_proxy_' . date('Y-m-d') . '.log';
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function log($message, $level = 'info', $context = []) {
        if (!LOG_ENABLED) return;

        $currentLevel = $this->logLevels[LOG_LEVEL] ?? 1;
        $messageLevel = $this->logLevels[$level] ?? 1;

        if ($messageLevel < $currentLevel) return;

        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
        $logMessage = "[$timestamp] [$level] $message$contextStr\n";

        file_put_contents($this->logFile, $logMessage, FILE_APPEND);

        if (php_sapi_name() === 'cli') {
            echo $logMessage;
        }
    }

    public function info($message, $context = []) { $this->log($message, 'info', $context); }
    public function warning($message, $context = []) { $this->log($message, 'warning', $context); }
    public function error($message, $context = []) { $this->log($message, 'error', $context); }
    public function debug($message, $context = []) { $this->log($message, 'debug', $context); }
}

$logger = APIProxyLogger::getInstance();

// ============================================
// Rate Limiting
// ============================================

class RateLimiter {
    private $requests = [];
    private $limit;
    private $window;

    public function __construct($limit = RATE_LIMIT_REQUESTS, $window = RATE_LIMIT_WINDOW) {
        $this->limit = $limit;
        $this->window = $window;
        $this->loadFromFile();
    }

    private function getClientId() {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $session = session_id() ?: 'cli';
        return md5($ip . $session);
    }

    private function loadFromFile() {
        $file = CACHE_DIR . 'rate_limit.json';
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            if ($data && isset($data['requests'])) {
                $this->requests = $data['requests'];
                $this->cleanup();
            }
        }
    }

    private function saveToFile() {
        $file = CACHE_DIR . 'rate_limit.json';
        file_put_contents($file, json_encode(['requests' => $this->requests, 'updated' => time()]));
    }

    private function cleanup() {
        $now = time();
        foreach ($this->requests as $id => $timestamps) {
            $this->requests[$id] = array_filter($timestamps, function($ts) use ($now) {
                return $ts > ($now - $this->window);
            });
            if (empty($this->requests[$id])) {
                unset($this->requests[$id]);
            }
        }
    }

    public function check() {
        if (!RATE_LIMIT_ENABLED) return true;

        $this->cleanup();
        $clientId = $this->getClientId();

        $count = count($this->requests[$clientId] ?? []);

        if ($count >= $this->limit) {
            return false;
        }

        $this->requests[$clientId][] = time();
        $this->saveToFile();
        return true;
    }

    public function getRemaining() {
        $clientId = $this->getClientId();
        $count = count($this->requests[$clientId] ?? []);
        return max(0, $this->limit - $count);
    }
}

// ============================================
// Cache Manager
// ============================================

class CacheManager {
    private $cacheDir;
    private $enabled;

    public function __construct() {
        $this->cacheDir = CACHE_DIR;
        $this->enabled = CACHE_ENABLED;
    }

    private function getCacheKey($key) {
        return md5($key) . '.json';
    }

    private function getCacheFile($key) {
        return $this->cacheDir . $this->getCacheKey($key);
    }

    public function get($key) {
        if (!$this->enabled) return null;

        $file = $this->getCacheFile($key);
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            if ($data && isset($data['expires']) && $data['expires'] > time()) {
                return $data['content'];
            }
        }
        return null;
    }

    public function set($key, $data, $duration = CACHE_DURATION) {
        if (!$this->enabled) return false;

        $file = $this->getCacheFile($key);
        $cacheData = [
            'content' => $data,
            'expires' => time() + $duration,
            'created' => time(),
            'version' => '3.0'
        ];
        return file_put_contents($file, json_encode($cacheData));
    }

    public function clear($pattern = null) {
        $files = glob($this->cacheDir . '*.json');
        foreach ($files as $file) {
            if ($pattern === null || strpos(basename($file), md5($pattern)) !== false) {
                unlink($file);
            }
        }
        return true;
    }

    public function getStats() {
        $files = glob($this->cacheDir . '*.json');
        $size = 0;
        foreach ($files as $file) {
            $size += filesize($file);
        }
        return [
            'count' => count($files),
            'size_kb' => round($size / 1024, 2),
            'size_mb' => round($size / 1048576, 2)
        ];
    }
}

// ============================================
// API Client
// ============================================

class APIClient {
    private $logger;
    private $cache;
    private $stats = [];

    public function __construct($logger, $cache) {
        $this->logger = $logger;
        $this->cache = $cache;
        $this->stats = ['calls' => 0, 'success' => 0, 'failed' => 0];
    }

    /**
     * Make API call to provider
     */
    public function call($provider, $params, $method = 'POST') {
        $this->stats['calls']++;
        $startTime = microtime(true);

        $config = PROVIDERS[$provider] ?? null;
        if (!$config || !$config['enabled']) {
            $this->logger->warning("Provider $provider is disabled or not found");
            return ['success' => false, 'error' => 'Provider unavailable'];
        }

        $url = $config['url'];
        unset($params['api_key']);
        $params['key'] = $config['key'];

        $this->logger->debug("Calling $provider API", ['action' => $params['action'] ?? 'unknown']);

        $lastError = 'Unknown API error';
        for ($attempt = 1; $attempt <= 3; $attempt++) {
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
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, $config['timeout']);
            curl_setopt($ch, CURLOPT_USERAGENT, 'BoostBangla-API-Proxy/3.0 (+https://boostbangla.com)');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded',
                'X-API-Provider: ' . $provider,
                'X-API-Version: 3.0'
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            $duration = round((microtime(true) - $startTime) * 1000, 2);

            curl_close($ch);

            if ($curlError) {
                $lastError = 'Network error contacting ' . $config['name'] . ': ' . $curlError;
                $this->logger->warning("CURL retry for $provider", ['attempt' => $attempt, 'error' => $curlError, 'duration' => $duration]);
            } elseif ($httpCode < 200 || $httpCode >= 300) {
                $lastError = $config['name'] . " returned HTTP $httpCode";
                $this->logger->warning("HTTP retry for $provider", ['attempt' => $attempt, 'code' => $httpCode, 'body' => substr((string)$response, 0, 500)]);
            } else {
                $decoded = json_decode($response, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $lastError = 'Invalid JSON from ' . $config['name'];
                    $this->logger->warning("JSON retry for $provider", ['attempt' => $attempt, 'error' => json_last_error_msg()]);
                } elseif (isset($decoded['error'])) {
                    $lastError = is_string($decoded['error']) ? $decoded['error'] : json_encode($decoded['error']);
                    $this->logger->warning("Provider error for $provider", ['attempt' => $attempt, 'error' => $lastError]);
                } else {
                    $this->stats['success']++;
                    $this->logger->debug("API call successful", ['provider' => $provider, 'duration' => $duration, 'attempt' => $attempt]);
                    return ['success' => true, 'data' => $decoded, 'provider' => $provider];
                }
            }

            if ($attempt < 3) {
                usleep((int)(pow(2, $attempt - 1) * 250000));
            }
        }

        $this->stats['failed']++;
        $this->logger->error("API call failed for $provider", ['error' => $lastError]);
        return ['success' => false, 'error' => $lastError, 'provider' => $provider];
    }

    /**
     * Call with automatic failover
     */
    public function callWithFailover($params, $method = 'POST', $providers = null) {
        $providersToTry = $providers ?? array_keys(PROVIDERS);
        $lastError = null;

        foreach ($providersToTry as $provider) {
            if (!isset(PROVIDERS[$provider]) || !PROVIDERS[$provider]['enabled']) {
                continue;
            }

            $result = $this->call($provider, $params, $method);

            if ($result['success'] && $this->isValidResponse($result['data'], $params['action'] ?? '')) {
                return $result;
            }

            $lastError = $result['error'] ?? 'No valid response';
            $this->logger->warning("Provider $provider failed, trying next", ['error' => $lastError]);
        }

        return ['success' => false, 'error' => $lastError];
    }

    /**
     * Validate response based on action
     */
    private function isValidResponse($data, $action) {
        switch ($action) {
            case 'services':
                return !empty($data) && (isset($data['services']) || is_array($data));
            case 'add':
                return isset($data['order']) || isset($data['order_id']);
            case 'status':
                return isset($data['status']);
            case 'balance':
                return isset($data['balance']);
            default:
                return !isset($data['error']);
        }
    }

    public function getStats() {
        return $this->stats;
    }
}

// ============================================
// Service Normalizer
// ============================================

class ServiceNormalizer {

    /**
     * Convert USD price to BDT with markup
     */
    public static function convertToBDT($usdPrice, $quantity = 1000) {
        $rate = getCurrentUsdToBdtRate() * PROFIT_MARGIN * PLATFORM_FEE;
        $pricePer1000BDT = $usdPrice * $rate;
        $totalPrice = ($pricePer1000BDT / 1000) * $quantity;

        return [
            'price_per_1000_usd' => round($usdPrice, 4),
            'price_per_1000_bdt' => round($pricePer1000BDT, 2),
            'price_per_unit_bdt' => round($pricePer1000BDT / 1000, 4),
            'total_price_bdt' => round($totalPrice, 2),
            'exchange_rate_used' => round($rate, 2)
        ];
    }

    /**
     * Detect category from service name
     */
    public static function detectCategory($name) {
        $nameLower = strtolower($name);
        $categories = [
            'youtube' => ['youtube', 'yt', 'video views', 'subscribers', 'likes youtube'],
            'facebook' => ['facebook', 'fb', 'page likes', 'followers facebook', 'reactions'],
            'instagram' => ['instagram', 'ig', 'followers instagram', 'likes instagram', 'reels'],
            'tiktok' => ['tiktok', 'tk', 'followers tiktok', 'views tiktok', 'likes tiktok'],
            'twitter' => ['twitter', 'x.com', 'tweets', 'retweets', 'followers twitter'],
            'telegram' => ['telegram', 'tg', 'members telegram', 'views telegram'],
            'traffic' => ['traffic', 'visitors', 'web traffic', 'website hits']
        ];

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($nameLower, $keyword) !== false) {
                    return $category;
                }
            }
        }
        return 'other';
    }

    /**
     * Get delivery time estimate
     */
    public static function getDeliveryTime($serviceName, $rate) {
        $nameLower = strtolower($serviceName);
        if (strpos($nameLower, 'instant') !== false) return 'Instant';
        if (strpos($nameLower, '0-3') !== false) return '0-3 Hours';
        if (strpos($nameLower, '1-2') !== false) return '1-2 Days';
        if (strpos($nameLower, '2-3') !== false) return '2-3 Days';
        if ($rate > 20) return '2-3 Days';
        if ($rate > 10) return '1-2 Days';
        if ($rate > 5) return '0-3 Hours';
        return '0-3 Hours';
    }

    /**
     * Get quality badge
     */
    public static function getQuality($serviceName) {
        $nameLower = strtolower($serviceName);
        if (strpos($nameLower, 'premium') !== false) return 'Premium';
        if (strpos($nameLower, 'high quality') !== false) return 'High Quality';
        if (strpos($nameLower, 'real') !== false) return 'Real Active';
        if (strpos($nameLower, 'non-drop') !== false) return 'Non-Drop';
        return 'Standard';
    }

    /**
     * Normalize service from provider
     */
    public static function normalize($service, $provider = 'amarboost') {
        $serviceId = $service['service'] ?? $service['id'] ?? $service['service_id'] ?? null;
        $name = $service['name'] ?? $service['service_name'] ?? '';
        $rate = floatval($service['rate'] ?? $service['price'] ?? 1);
        $min = intval($service['min'] ?? $service['min_amount'] ?? 10);
        $max = intval($service['max'] ?? $service['max_amount'] ?? 1000000);

        $priceInfo = self::convertToBDT($rate, 1000);
        $category = $service['category'] ?? self::detectCategory($name);

        return [
            'service' => (string)$serviceId,
            'name' => $name,
            'rate' => $rate,
            'min' => $min,
            'max' => $max,
            'category' => $category,
            'avg_time' => $service['avg_time'] ?? self::getDeliveryTime($name, $rate),
            'quality' => self::getQuality($name),
            'price_bdt' => $priceInfo['price_per_1000_bdt'],
            'price_per_1000_bdt' => $priceInfo['price_per_1000_bdt'],
            'price_per_unit_bdt' => $priceInfo['price_per_unit_bdt'],
            'provider' => $provider,
            'min_quantity' => $min,
            'max_quantity' => $max,
            'status' => 'active'
        ];
    }
}

// ============================================
// Sample Services (Fallback)
// ============================================

function getSampleServices() {
    return [
        ['service' => 6205, 'name' => 'YouTube High Retention Views', 'rate' => 2.50, 'min' => 100, 'max' => 1000000, 'category' => 'youtube', 'avg_time' => '0-3 Hours', 'quality' => 'Premium'],
        ['service' => 6206, 'name' => 'YouTube Subscribers', 'rate' => 15.00, 'min' => 10, 'max' => 50000, 'category' => 'youtube', 'avg_time' => '1-2 Days', 'quality' => 'Real Active'],
        ['service' => 6207, 'name' => 'Facebook Page Likes', 'rate' => 3.50, 'min' => 100, 'max' => 500000, 'category' => 'facebook', 'avg_time' => '0-3 Hours', 'quality' => 'Real'],
        ['service' => 6208, 'name' => 'Instagram Followers', 'rate' => 5.00, 'min' => 100, 'max' => 500000, 'category' => 'instagram', 'avg_time' => '0-3 Hours', 'quality' => 'High Quality'],
        ['service' => 6209, 'name' => 'TikTok Followers', 'rate' => 6.00, 'min' => 100, 'max' => 500000, 'category' => 'tiktok', 'avg_time' => '1-2 Days', 'quality' => 'Real'],
        ['service' => 6210, 'name' => 'Twitter Followers', 'rate' => 7.00, 'min' => 100, 'max' => 100000, 'category' => 'twitter', 'avg_time' => '1-2 Days', 'quality' => 'Real Active'],
        ['service' => 6211, 'name' => 'Telegram Members', 'rate' => 8.00, 'min' => 100, 'max' => 100000, 'category' => 'telegram', 'avg_time' => '1-2 Days', 'quality' => 'Real'],
        ['service' => 6212, 'name' => 'Website Traffic', 'rate' => 2.00, 'min' => 1000, 'max' => 1000000, 'category' => 'traffic', 'avg_time' => 'Instant', 'quality' => 'Real Visitors']
    ];
}

// ============================================
// Main Request Handler
// ============================================

$rateLimiter = new RateLimiter();
$cache = new CacheManager();
$apiClient = new APIClient($logger, $cache);

// Check rate limit
if (!$rateLimiter->check()) {
    $logger->warning("Rate limit exceeded", ['remaining' => 0]);
    echo json_encode([
        'success' => false,
        'error' => 'Rate limit exceeded. Please try again later.',
        'rate_limit' => RATE_LIMIT_REQUESTS,
        'retry_after' => RATE_LIMIT_WINDOW
    ]);
    exit();
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$cacheKey = null;

// ============================================
// Action Handlers
// ============================================

switch ($action) {
    case 'services':
        $cacheKey = 'services_v3_' . date('YmdH');
        $cached = $cache->get($cacheKey);

        if ($cached !== null) {
            $logger->info("Serving cached services", ['count' => count($cached)]);
            echo json_encode([
                'success' => true,
                'services' => $cached,
                'cached' => true,
                'total' => count($cached),
                'timestamp' => date('c'),
                'version' => '3.0'
            ]);
            break;
        }

        $result = $apiClient->callWithFailover(['action' => 'services'], 'POST', ['amarboost']);

        if ($result['success']) {
            $servicesData = $result['data'];
            $servicesList = $servicesData['services'] ?? (is_array($servicesData) ? $servicesData : []);

            $normalized = [];
            foreach ($servicesList as $service) {
                if (is_array($service)) {
                    $normalized[] = ServiceNormalizer::normalize($service, $result['provider']);
                }
            }

            if (empty($normalized)) {
                $normalized = getSampleServices();
                foreach ($normalized as &$s) {
                    $priceInfo = ServiceNormalizer::convertToBDT($s['rate'], 1000);
                    $s['price_bdt'] = $priceInfo['price_per_1000_bdt'];
                    $s['price_per_1000_bdt'] = $priceInfo['price_per_1000_bdt'];
                    $s['price_per_unit_bdt'] = $priceInfo['price_per_unit_bdt'];
                }
                $result['provider'] = 'sample';
            }

            $cache->set($cacheKey, $normalized);

            echo json_encode([
                'success' => true,
                'services' => $normalized,
                'provider' => $result['provider'],
                'total' => count($normalized),
                'exchange_rate' => getCurrentUsdToBdtRate(),
                'profit_margin' => (PROFIT_MARGIN - 1) * 100 . '%',
                'platform_fee' => (PLATFORM_FEE - 1) * 100 . '%',
                'timestamp' => date('c'),
                'version' => '3.0'
            ]);
        } else {
            // Fallback to sample services
            $sampleServices = getSampleServices();
            $normalized = [];
            foreach ($sampleServices as $service) {
                $normalized[] = ServiceNormalizer::normalize($service, 'sample');
            }

            echo json_encode([
                'success' => true,
                'services' => $normalized,
                'provider' => 'sample',
                'is_demo' => true,
                'total' => count($normalized),
                'warning' => 'Using demo data - API unavailable',
                'timestamp' => date('c'),
                'version' => '3.0'
            ]);
        }
        break;

    case 'add':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) $input = $_POST;

        $serviceId = $input['service_id'] ?? $input['service'] ?? null;
        $link = $input['link'] ?? $input['url'] ?? null;
        $quantity = $input['quantity'] ?? null;

        if (!$serviceId || !$link || !$quantity) {
            echo json_encode([
                'success' => false,
                'error' => 'Missing required parameters: service_id, link, quantity',
                'required' => ['service_id', 'link', 'quantity']
            ]);
            break;
        }

        if ($quantity < 1) {
            echo json_encode([
                'success' => false,
                'error' => 'Quantity must be at least 1'
            ]);
            break;
        }

        // Validate link format
        if (!filter_var($link, FILTER_VALIDATE_URL) && !str_starts_with($link, '@')) {
            echo json_encode([
                'success' => false,
                'error' => 'Invalid link format. Please provide a valid URL or username.'
            ]);
            break;
        }

        $result = $apiClient->callWithFailover([
            'action' => 'add',
            'service' => $serviceId,
            'link' => $link,
            'quantity' => $quantity
        ], 'POST', ['amarboost']);

        if ($result['success']) {
            echo json_encode([
                'success' => true,
                'order_id' => $result['data']['order'] ?? $result['data']['order_id'] ?? null,
                'provider' => $result['provider'],
                'message' => 'Order placed successfully',
                'timestamp' => date('c')
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to place order. Please try again.',
                'timestamp' => date('c')
            ]);
        }
        break;

    case 'status':
        $orderId = $_GET['order'] ?? $_POST['order'] ?? null;

        if (!$orderId) {
            echo json_encode([
                'success' => false,
                'error' => 'Order ID required'
            ]);
            break;
        }

        $result = $apiClient->callWithFailover([
            'action' => 'status',
            'order' => $orderId
        ], 'POST', ['amarboost']);

        if ($result['success']) {
            $statusMap = [
                'pending' => 'pending',
                'processing' => 'processing',
                'inprogress' => 'processing',
                'completed' => 'completed',
                'partial' => 'partial',
                'cancelled' => 'cancelled',
                'error' => 'failed'
            ];

            $providerStatus = $result['data']['status'] ?? 'unknown';
            $mappedStatus = $statusMap[strtolower($providerStatus)] ?? 'pending';

            echo json_encode([
                'success' => true,
                'order_id' => $orderId,
                'status' => $mappedStatus,
                'provider_status' => $providerStatus,
                'start_count' => $result['data']['start_count'] ?? null,
                'remains' => $result['data']['remains'] ?? null,
                'charged' => $result['data']['charged'] ?? null,
                'provider' => $result['provider'],
                'timestamp' => date('c')
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to get order status',
                'order_id' => $orderId,
                'timestamp' => date('c')
            ]);
        }
        break;

    case 'balance':
        $result = $apiClient->callWithFailover(['action' => 'balance'], 'POST', ['amarboost']);

        if ($result['success']) {
            echo json_encode([
                'success' => true,
                'balance' => $result['data']['balance'] ?? 0,
                'currency' => 'USD',
                'provider' => $result['provider'],
                'timestamp' => date('c')
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to get balance',
                'timestamp' => date('c')
            ]);
        }
        break;

    case 'providers':
        $providersStatus = [];
        foreach (PROVIDERS as $key => $config) {
            $providersStatus[$key] = [
                'name' => $config['name'],
                'status' => $config['enabled'] ? 'active' : 'inactive',
                'priority' => $config['priority']
            ];
        }

        echo json_encode([
            'success' => true,
            'providers' => $providersStatus,
            'active_providers' => count(array_filter(PROVIDERS, fn($p) => $p['enabled'])),
            'timestamp' => date('c')
        ]);
        break;

    case 'clear-cache':
        $secret = $_GET['secret'] ?? $_POST['secret'] ?? '';
        if ($secret !== 'boostbangla_admin_2024') {
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            break;
        }

        $cache->clear();
        $logger->info("Cache cleared by admin");

        echo json_encode([
            'success' => true,
            'message' => 'Cache cleared successfully',
            'timestamp' => date('c')
        ]);
        break;

    case 'get_user_orders':
        // Get all orders for a user
        require_once __DIR__ . '/database.php';
        $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        $limit = (int)($_GET['limit'] ?? $_POST['limit'] ?? 100);

        if (!$userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'user_id is required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $orders = $db->query(
                "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                [$userId, $limit]
            );

            echo json_encode([
                'success' => true,
                'orders' => $orders ?: [],
                'total' => count($orders ?: [])
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'get_order':
        // Get specific order details
        require_once __DIR__ . '/database.php';
        $orderId = $_GET['order_id'] ?? $_POST['order_id'] ?? '';

        if (!$orderId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'order_id is required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $order = $db->queryOne(
                "SELECT * FROM orders WHERE local_order_id = ? OR id = ?",
                [$orderId, $orderId]
            );

            if (!$order) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Order not found']);
                break;
            }

            echo json_encode([
                'success' => true,
                'order' => $order
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'cancel_order':
        // Cancel an order
        require_once __DIR__ . '/database.php';
        $orderId = $_GET['order_id'] ?? $_POST['order_id'] ?? '';

        if (!$orderId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'order_id is required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $order = $db->queryOne(
                "SELECT * FROM orders WHERE local_order_id = ? OR id = ?",
                [$orderId, $orderId]
            );

            if (!$order) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Order not found']);
                break;
            }

            // Refund user in MySQL wallet
            $wallet = $db->queryOne("SELECT balance, total_refunded FROM user_wallets WHERE user_id = ?", [$order['user_id']]);
            $balanceBefore = (float)($wallet['balance'] ?? 0);
            $refundAmount = (float)$order['user_price'];
            $newBalance = $balanceBefore + $refundAmount;
            $db->updateRow('user_wallets',
                ['balance' => $newBalance, 'total_refunded' => (float)($wallet['total_refunded'] ?? 0) + $refundAmount],
                ['user_id' => $order['user_id']]
            );

            $db->insert(
                "INSERT INTO order_transactions (order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id)
                 VALUES (?, ?, 'refund', ?, ?, ?, ?, ?)",
                'isdddss',
                [(int)$order['id'], $order['user_id'], $refundAmount, $balanceBefore, $newBalance, 'Order #' . $order['id'] . ' cancelled refund', (string)($order['amarboost_order_id'] ?? $order['id'])]
            );

            // Update order status
            $db->update(
                "UPDATE orders SET status = 'cancelled', local_status = 'cancelled', updated_at = NOW() WHERE id = ?",
                'i',
                [(int)$order['id']]
            );

            echo json_encode([
                'success' => true,
                'message' => 'Order cancelled and refunded',
                'refund_amount' => $refundAmount,
                'new_balance' => $newBalance
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'get_balance':
    case 'get_user_balance':
        // Get user balance
        require_once __DIR__ . '/database.php';
        $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? '';

        if (!$userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'user_id is required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $wallet = $db->queryOne(
                "SELECT balance FROM user_wallets WHERE user_id = ?",
                [$userId]
            );

            echo json_encode([
                'success' => true,
                'balance' => $wallet['balance'] ?? 0,
                'wallet_exists' => (bool)$wallet,
                'source' => $wallet ? 'mysql' : 'missing_wallet',
                'user_id' => $userId
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'get_user_transactions':
        require_once __DIR__ . '/database.php';
        $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        $limit = (int)($_GET['limit'] ?? $_POST['limit'] ?? 100);

        if (!$userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'user_id is required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $transactions = $db->query(
                "SELECT id, order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at
                 FROM order_transactions
                 WHERE user_id = ?
                 ORDER BY created_at DESC
                 LIMIT ?",
                [$userId, $limit]
            );

            echo json_encode([
                'success' => true,
                'transactions' => $transactions ?: [],
                'total' => count($transactions ?: [])
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'add_balance':
        // Add balance to user wallet
        require_once __DIR__ . '/database.php';
        $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        $amount = (float)($_GET['amount'] ?? $_POST['amount'] ?? 0);
        $method = $_GET['method'] ?? $_POST['method'] ?? 'stripe';

        if (!$userId || !$amount) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'user_id and amount are required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $db->beginTransaction();

            // Get current balance
            $wallet = $db->queryOne(
                "SELECT balance FROM user_wallets WHERE user_id = ?",
                [$userId]
            );

            $newBalance = ($wallet['balance'] ?? 0) + $amount;

            // Update balance
            if ($wallet) {
                $db->updateRow('user_wallets',
                    ['balance' => $newBalance, 'updated_at' => date('Y-m-d H:i:s')],
                    ['user_id' => $userId]
                );
            } else {
                $db->insertRow('user_wallets', [
                    'user_id' => $userId,
                    'balance' => $newBalance,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }

            $db->insert(
                "INSERT INTO order_transactions (order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id)
                 VALUES (NULL, ?, 'credit', ?, ?, ?, ?, ?)",
                'sdddss',
                [$userId, $amount, $wallet['balance'] ?? 0, $newBalance, 'Balance added via ' . $method, uniqid('txn_')]
            );

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Balance added successfully',
                'new_balance' => $newBalance,
                'amount_added' => $amount
            ]);
        } catch (Exception $e) {
            $db->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'record_transaction':
        require_once __DIR__ . '/database.php';
        $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        $amount = (float)($_GET['amount'] ?? $_POST['amount'] ?? 0);
        $type = $_GET['transaction_type'] ?? $_POST['transaction_type'] ?? 'credit';
        $description = $_GET['description'] ?? $_POST['description'] ?? 'Transaction recorded';
        $reference = $_GET['reference_id'] ?? $_POST['reference_id'] ?? uniqid('ref_');

        if (!$userId || !$amount) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'user_id and amount are required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $wallet = $db->queryOne("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
            if (!$wallet) {
                $db->insertRow('user_wallets', ['user_id' => $userId, 'balance' => 0]);
                $wallet = ['balance' => 0];
            }
            $balance = (float)($wallet['balance'] ?? 0);
            $validTypes = ['debit', 'credit', 'refund', 'fee'];
            $type = in_array($type, $validTypes, true) ? $type : 'credit';
            $db->insert(
                "INSERT INTO order_transactions (order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id)
                 VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)",
                'ssdddss',
                [$userId, $type, abs($amount), $balance, $balance, $description, $reference]
            );
            echo json_encode(['success' => true, 'message' => 'Transaction recorded']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'adjust_balance':
        require_once __DIR__ . '/database.php';
        $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        $amount = (float)($_GET['amount'] ?? $_POST['amount'] ?? 0);
        $description = $_GET['description'] ?? $_POST['description'] ?? 'Balance adjustment';
        $reference = $_GET['reference_id'] ?? $_POST['reference_id'] ?? uniqid('adj_');

        if (!$userId || $amount == 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'user_id and non-zero amount are required']);
            break;
        }

        try {
            $db = Database::getInstance();
            $db->beginTransaction();
            $wallet = $db->queryOne("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
            if (!$wallet) {
                $db->insertRow('user_wallets', ['user_id' => $userId, 'balance' => 0]);
                $wallet = ['balance' => 0];
            }
            $before = (float)($wallet['balance'] ?? 0);
            $after = $before + $amount;
            $db->updateRow('user_wallets', ['balance' => $after, 'updated_at' => date('Y-m-d H:i:s')], ['user_id' => $userId]);
            $txType = $amount < 0 ? 'debit' : 'credit';
            $db->insert(
                "INSERT INTO order_transactions (order_id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id)
                 VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)",
                'ssdddss',
                [$userId, $txType, abs($amount), $before, $after, $description, $reference]
            );
            $db->commit();
            echo json_encode(['success' => true, 'balance' => $after]);
        } catch (Exception $e) {
            if (isset($db)) $db->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'stats':
        $cacheStats = $cache->getStats();
        $apiStats = $apiClient->getStats();

        echo json_encode([
            'success' => true,
            'cache' => $cacheStats,
            'api_calls' => $apiStats,
            'rate_limit' => [
                'limit' => RATE_LIMIT_REQUESTS,
                'remaining' => $rateLimiter->getRemaining(),
                'window_seconds' => RATE_LIMIT_WINDOW
            ],
            'version' => '3.0',
            'timestamp' => date('c')
        ]);
        break;

    default:
        echo json_encode([
            'success' => false,
            'error' => 'Unknown action',
            'available_actions' => ['services', 'add', 'status', 'balance', 'providers', 'stats', 'clear-cache', 'get_user_orders', 'get_order', 'cancel_order', 'get_balance', 'get_user_balance', 'get_user_transactions', 'add_balance', 'record_transaction', 'adjust_balance'],
            'version' => '3.0',
            'documentation' => 'https://docs.boostbangla.com/api'
        ]);
        break;
}

// ============================================
// Log API Call
// ============================================

$logger->info("API call completed", [
    'action' => $action,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'remaining_requests' => $rateLimiter->getRemaining()
]);
?>
