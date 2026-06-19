<?php
// ============================================
// BoostBangla Exchange Rate Manager - Premium Design System v3.0
// Multi-provider exchange rate with fallback, caching, and monitoring
// Version: 3.0
// ============================================

// ============================================
// Configuration
// ============================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: public, max-age=300'); // 5 minutes cache

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/exchange_errors.log');

// Timezone
date_default_timezone_set('Asia/Dhaka');

// Configuration Constants
define('CACHE_DIR', __DIR__ . '/../cache/');
define('CACHE_DURATION', 3600); // 1 hour cache for exchange rates
define('LOG_DIR', __DIR__ . '/logs/');
define('DEFAULT_RATE', 120.00);
define('PLATFORM_FEE_PERCENTAGE', 5);
define('PROFIT_MARGIN', 1.30); // 30% markup for services

// Rate Providers - Multiple fallback sources
define('PROVIDERS', [
    'hexarate' => [
        'url' => 'https://hexarate.paikama.co/api/rates/latest/USD?target=BDT',
        'parse' => function($data) {
            return $data['data']['mid'] ?? null;
        }
    ],
    'exchangerate-api' => [
        'url' => 'https://api.exchangerate-api.com/v4/latest/USD',
        'parse' => function($data) {
            return $data['rates']['BDT'] ?? null;
        }
    ],
    'currencyapi' => [
        'url' => 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
        'parse' => function($data) {
            return $data['usd']['bdt'] ?? null;
        }
    ]
]);

// Create required directories
if (!file_exists(CACHE_DIR)) {
    mkdir(CACHE_DIR, 0755, true);
}
if (!file_exists(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

// ============================================
// Exchange Rate Manager Class
// ============================================

class ExchangeRateManager {
    private $cacheFile;
    private $logFile;
    private $rate = DEFAULT_RATE;
    private $lastUpdated = null;
    private $provider = 'fallback';
    private $providers = [];
    
    public function __construct() {
        $this->cacheFile = CACHE_DIR . 'exchange_rate_cache.json';
        $this->logFile = LOG_DIR . 'exchange_rates.log';
        $this->providers = PROVIDERS;
        
        $this->loadCachedRate();
    }
    
    /**
     * Load cached exchange rate if available and not expired
     */
    private function loadCachedRate() {
        if (file_exists($this->cacheFile)) {
            $cache = json_decode(file_get_contents($this->cacheFile), true);
            if ($cache && isset($cache['rate']) && isset($cache['expires'])) {
                if ($cache['expires'] > time()) {
                    $this->rate = $cache['rate'];
                    $this->lastUpdated = $cache['last_updated'];
                    $this->provider = $cache['provider'] ?? 'cached';
                    $this->log("Loaded cached rate: {$this->rate} BDT/USD");
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Save rate to cache
     */
    private function saveToCache($rate, $provider, $duration = CACHE_DURATION) {
        $cacheData = [
            'rate' => $rate,
            'provider' => $provider,
            'last_updated' => date('Y-m-d H:i:s'),
            'expires' => time() + $duration,
            'version' => '3.0'
        ];
        
        file_put_contents($this->cacheFile, json_encode($cacheData));
        $this->log("Cached rate: $rate BDT/USD from $provider");
    }
    
    /**
     * Log messages
     */
    private function log($message, $level = 'info') {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] [$level] $message\n";
        file_put_contents($this->logFile, $logMessage, FILE_APPEND);
    }
    
    /**
     * Fetch rate from a specific provider
     */
    private function fetchFromProvider($providerName, $providerConfig) {
        $this->log("Fetching rate from $providerName");
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $providerConfig['url']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_USERAGENT, 'BoostBangla/3.0');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json',
            'Accept-Language: en-US,en;q=0.9'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            $this->log("CURL Error from $providerName: $curlError", 'warning');
            return null;
        }
        
        if ($httpCode !== 200) {
            $this->log("HTTP Error $httpCode from $providerName", 'warning');
            return null;
        }
        
        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->log("JSON Parse Error from $providerName", 'warning');
            return null;
        }
        
        $rate = $providerConfig['parse']($data);
        
        if ($rate && is_numeric($rate) && $rate > 0) {
            $this->log("Successfully fetched rate from $providerName: $rate");
            return round($rate, 2);
        }
        
        return null;
    }
    
    /**
     * Get current exchange rate from best available provider
     */
    public function getRate($forceRefresh = false) {
        // Return cached rate if not forced refresh
        if (!$forceRefresh && $this->rate !== DEFAULT_RATE && $this->lastUpdated) {
            $cacheAge = time() - strtotime($this->lastUpdated);
            if ($cacheAge < CACHE_DURATION) {
                return $this->rate;
            }
        }
        
        $this->log("Fetching fresh exchange rate...");
        
        // Try providers in order
        foreach ($this->providers as $name => $config) {
            $rate = $this->fetchFromProvider($name, $config);
            if ($rate !== null) {
                $this->rate = $rate;
                $this->provider = $name;
                $this->lastUpdated = date('Y-m-d H:i:s');
                $this->saveToCache($rate, $name);
                return $rate;
            }
        }
        
        // Fallback to cached rate even if expired
        if ($this->rate !== DEFAULT_RATE) {
            $this->log("Using expired cached rate: {$this->rate}", 'warning');
            return $this->rate;
        }
        
        // Ultimate fallback to default rate
        $this->log("Using default rate: " . DEFAULT_RATE, 'error');
        return DEFAULT_RATE;
    }
    
    /**
     * Get rate with platform fee
     */
    public function getRateWithFee() {
        $baseRate = $this->getRate();
        $feeMultiplier = 1 + (PLATFORM_FEE_PERCENTAGE / 100);
        return round($baseRate * $feeMultiplier, 2);
    }
    
    /**
     * Get profit margin rate (for service pricing)
     */
    public function getProfitMarginRate() {
        $baseRate = $this->getRate();
        return round($baseRate * PROFIT_MARGIN, 2);
    }
    
    /**
     * Convert USD to BDT
     */
    public function usdToBdt($usd, $includeFee = false) {
        $rate = $includeFee ? $this->getRateWithFee() : $this->getRate();
        return round($usd * $rate, 2);
    }
    
    /**
     * Convert BDT to USD
     */
    public function bdtToUsd($bdt, $includeFee = false) {
        $rate = $includeFee ? $this->getRateWithFee() : $this->getRate();
        return round($bdt / $rate, 2);
    }
    
    /**
     * Get service price in BDT (USD price per 1000 * rate * profit margin)
     */
    public function getServicePriceBdt($usdPricePer1000, $quantity = 1000) {
        $rate = $this->getProfitMarginRate();
        $pricePer1000Bdt = $usdPricePer1000 * $rate;
        $totalPrice = ($pricePer1000Bdt / 1000) * $quantity;
        
        return [
            'price_per_1000_usd' => round($usdPricePer1000, 4),
            'price_per_1000_bdt' => round($pricePer1000Bdt, 2),
            'price_per_unit_bdt' => round($pricePer1000Bdt / 1000, 4),
            'total_price_bdt' => round($totalPrice, 2),
            'exchange_rate' => $this->getRate(),
            'profit_margin' => PROFIT_MARGIN,
            'platform_fee' => PLATFORM_FEE_PERCENTAGE . '%'
        ];
    }
    
    /**
     * Get complete exchange rate information
     */
    public function getFullInfo() {
        $baseRate = $this->getRate();
        
        return [
            'success' => true,
            'usd_to_bdt' => $baseRate,
            'usd_to_bdt_with_fee' => $this->getRateWithFee(),
            'usd_to_bdt_profit_margin' => $this->getProfitMarginRate(),
            'platform_fee_percentage' => PLATFORM_FEE_PERCENTAGE,
            'profit_margin_percentage' => round((PROFIT_MARGIN - 1) * 100, 1),
            'last_updated' => $this->lastUpdated,
            'provider' => $this->provider,
            'cache_duration_seconds' => CACHE_DURATION,
            'version' => '3.0',
            'timestamp' => date('Y-m-d H:i:s'),
            'conversion_examples' => [
                ['usd' => 1, 'bdt' => $this->usdToBdt(1)],
                ['usd' => 5, 'bdt' => $this->usdToBdt(5)],
                ['usd' => 10, 'bdt' => $this->usdToBdt(10)],
                ['usd' => 25, 'bdt' => $this->usdToBdt(25)],
                ['usd' => 50, 'bdt' => $this->usdToBdt(50)],
                ['usd' => 100, 'bdt' => $this->usdToBdt(100)]
            ]
        ];
    }
    
    /**
     * Get exchange rate history (from cache logs)
     */
    public function getHistory($hours = 24) {
        $history = [];
        
        if (file_exists($this->logFile)) {
            $lines = file($this->logFile);
            $lines = array_reverse($lines);
            $cutoff = time() - ($hours * 3600);
            
            foreach ($lines as $line) {
                if (preg_match('/\[(.*?)\].*rate: (\d+\.?\d*) BDT/', $line, $matches)) {
                    $timestamp = strtotime($matches[1]);
                    if ($timestamp >= $cutoff) {
                        $history[] = [
                            'timestamp' => $matches[1],
                            'rate' => floatval($matches[2])
                        ];
                    }
                }
                if (count($history) >= 100) break;
            }
        }
        
        return array_reverse($history);
    }
    
    /**
     * Force refresh rate from all providers
     */
    public function forceRefresh() {
        $this->log("Force refresh requested");
        return $this->getRate(true);
    }
}

// ============================================
// Initialize Manager
// ============================================

$exchangeManager = new ExchangeRateManager();

// ============================================
// Handle API Requests
// ============================================

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$format = $_GET['format'] ?? 'json';

switch ($action) {
    case 'convert':
        $usd = floatval($_GET['usd'] ?? $_POST['usd'] ?? 0);
        $bdt = floatval($_GET['bdt'] ?? $_POST['bdt'] ?? 0);
        $includeFee = filter_var($_GET['include_fee'] ?? $_POST['include_fee'] ?? false, FILTER_VALIDATE_BOOLEAN);
        
        if ($usd > 0) {
            $result = [
                'success' => true,
                'from' => 'USD',
                'to' => 'BDT',
                'amount' => $usd,
                'converted' => $exchangeManager->usdToBdt($usd, $includeFee),
                'rate' => $includeFee ? $exchangeManager->getRateWithFee() : $exchangeManager->getRate(),
                'include_fee' => $includeFee
            ];
        } elseif ($bdt > 0) {
            $result = [
                'success' => true,
                'from' => 'BDT',
                'to' => 'USD',
                'amount' => $bdt,
                'converted' => $exchangeManager->bdtToUsd($bdt, $includeFee),
                'rate' => $includeFee ? $exchangeManager->getRateWithFee() : $exchangeManager->getRate(),
                'include_fee' => $includeFee
            ];
        } else {
            $result = [
                'success' => false,
                'error' => 'Please provide either usd or bdt parameter'
            ];
        }
        break;
        
    case 'service-price':
        $usdPrice = floatval($_GET['price'] ?? $_POST['price'] ?? 0);
        $quantity = floatval($_GET['quantity'] ?? $_POST['quantity'] ?? 1000);
        
        if ($usdPrice > 0) {
            $result = $exchangeManager->getServicePriceBdt($usdPrice, $quantity);
        } else {
            $result = [
                'success' => false,
                'error' => 'Please provide price parameter (USD price per 1000)'
            ];
        }
        break;
        
    case 'history':
        $hours = intval($_GET['hours'] ?? 24);
        $result = [
            'success' => true,
            'history' => $exchangeManager->getHistory($hours),
            'hours' => $hours
        ];
        break;
        
    case 'refresh':
        $rate = $exchangeManager->forceRefresh();
        $result = [
            'success' => true,
            'usd_to_bdt' => $rate,
            'message' => 'Exchange rate refreshed successfully',
            'provider' => $exchangeManager->provider
        ];
        break;
        
    case 'stats':
        $result = [
            'success' => true,
            'cache_file_exists' => file_exists(CACHE_DIR . 'exchange_rate_cache.json'),
            'log_file_exists' => file_exists(LOG_DIR . 'exchange_rates.log'),
            'cache_size' => file_exists(CACHE_DIR . 'exchange_rate_cache.json') ? round(filesize(CACHE_DIR . 'exchange_rate_cache.json') / 1024, 2) . ' KB' : 'N/A',
            'php_version' => phpversion(),
            'curl_enabled' => extension_loaded('curl')
        ];
        break;
        
    default:
        // Default: return full exchange info
        $result = $exchangeManager->getFullInfo();
        
        // Add decorative elements for design system
        if ($format === 'json') {
            $result['design_system'] = [
                'version' => '3.0',
                'name' => 'BoostBangla Premium Design System',
                'primary_color' => '#FF6B00',
                'supported_currencies' => ['USD', 'BDT']
            ];
        }
        break;
}

// ============================================
// Output Response
// ============================================

if ($format === 'json') {
    echo json_encode($result, JSON_PRETTY_PRINT);
} else {
    // HTML output for browser access
    $info = $exchangeManager->getFullInfo();
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
        <title>BoostBangla Exchange Rate v3.0</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
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
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            /* Header Section */
            .header {
                text-align: center;
                margin-bottom: 40px;
                animation: slideDown 0.5s ease-out;
            }
            
            .logo-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #FF6B00, #CC5500);
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                animation: float 3s ease-in-out infinite;
            }
            
            .logo-icon i {
                font-size: 40px;
                color: white;
            }
            
            h1 {
                color: white;
                font-size: 36px;
                font-weight: 800;
                margin-bottom: 8px;
            }
            
            .version {
                color: #FF6B00;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 2px;
            }
            
            /* Rate Card */
            .rate-card {
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 32px;
                padding: 32px;
                margin-bottom: 32px;
                border: 1px solid rgba(255, 107, 0, 0.3);
                box-shadow: 0 35px 45px -15px rgba(0, 0, 0, 0.4);
                transition: transform 0.3s ease;
            }
            
            .rate-card:hover {
                transform: translateY(-4px);
            }
            
            .rate-value {
                text-align: center;
                margin-bottom: 24px;
            }
            
            .rate-number {
                font-size: 64px;
                font-weight: 900;
                background: linear-gradient(135deg, #FF6B00, #FF8C42);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                line-height: 1;
            }
            
            .rate-label {
                color: #94a3b8;
                font-size: 16px;
                margin-top: 8px;
            }
            
            .rate-info {
                display: flex;
                justify-content: center;
                gap: 32px;
                flex-wrap: wrap;
                padding-top: 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .info-item {
                text-align: center;
            }
            
            .info-label {
                color: #64748b;
                font-size: 12px;
                margin-bottom: 4px;
            }
            
            .info-value {
                color: white;
                font-weight: 700;
                font-size: 16px;
            }
            
            .info-value.success {
                color: #10b981;
            }
            
            /* Converter Section */
            .converter-card {
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 32px;
                padding: 32px;
                margin-bottom: 32px;
                border: 1px solid rgba(255, 107, 0, 0.3);
            }
            
            .converter-title {
                font-size: 20px;
                font-weight: 700;
                color: white;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .converter-title i {
                color: #FF6B00;
                font-size: 24px;
            }
            
            .converter-grid {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                gap: 20px;
                align-items: center;
            }
            
            .converter-input {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 20px;
                padding: 20px;
            }
            
            .converter-input label {
                display: block;
                color: #94a3b8;
                font-size: 12px;
                margin-bottom: 8px;
            }
            
            .converter-input input {
                width: 100%;
                background: transparent;
                border: none;
                font-size: 32px;
                font-weight: 700;
                color: white;
                outline: none;
            }
            
            .converter-input input::placeholder {
                color: #475569;
            }
            
            .converter-switch {
                background: linear-gradient(135deg, #FF6B00, #CC5500);
                width: 48px;
                height: 48px;
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.3s ease;
            }
            
            .converter-switch:hover {
                transform: scale(1.1);
            }
            
            .converter-switch i {
                color: white;
                font-size: 20px;
            }
            
            /* Stats Grid */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 24px;
                margin-bottom: 32px;
            }
            
            .stat-card {
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 24px;
                padding: 24px;
                border: 1px solid rgba(255, 107, 0, 0.2);
                transition: all 0.3s ease;
            }
            
            .stat-card:hover {
                transform: translateY(-4px);
                border-color: rgba(255, 107, 0, 0.5);
            }
            
            .stat-icon {
                width: 48px;
                height: 48px;
                background: rgba(255, 107, 0, 0.1);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
            }
            
            .stat-icon i {
                font-size: 24px;
                color: #FF6B00;
            }
            
            .stat-value {
                font-size: 28px;
                font-weight: 800;
                color: white;
                margin-bottom: 4px;
            }
            
            .stat-label {
                color: #94a3b8;
                font-size: 14px;
            }
            
            /* Conversion Table */
            .table-card {
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 32px;
                padding: 32px;
                border: 1px solid rgba(255, 107, 0, 0.3);
            }
            
            .table-title {
                font-size: 20px;
                font-weight: 700;
                color: white;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .conversion-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .conversion-table th {
                text-align: left;
                padding: 12px;
                color: #94a3b8;
                font-weight: 600;
                font-size: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .conversion-table td {
                padding: 12px;
                color: white;
                font-weight: 500;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .conversion-table tr:hover td {
                background: rgba(255, 107, 0, 0.1);
            }
            
            /* Refresh Button */
            .refresh-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: linear-gradient(135deg, #FF6B00, #CC5500);
                width: 56px;
                height: 56px;
                border-radius: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 8px 20px rgba(255, 107, 0, 0.4);
                transition: all 0.3s ease;
                border: none;
                z-index: 1000;
            }
            
            .refresh-btn:hover {
                transform: scale(1.1);
            }
            
            .refresh-btn i {
                color: white;
                font-size: 24px;
            }
            
            .refresh-btn.loading i {
                animation: spin 1s linear infinite;
            }
            
            /* Animations */
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .converter-grid {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                
                .converter-switch {
                    margin: 0 auto;
                    transform: rotate(90deg);
                }
                
                .rate-number {
                    font-size: 48px;
                }
                
                h1 {
                    font-size: 28px;
                }
                
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .refresh-btn {
                    bottom: 80px;
                }
            }
            
            @media (max-width: 480px) {
                .rate-card, .converter-card, .table-card {
                    padding: 20px;
                }
                
                .rate-number {
                    font-size: 36px;
                }
            }
            
            /* Toast Notification */
            .toast-notification {
                position: fixed;
                bottom: 100px;
                right: 24px;
                background: rgba(30, 41, 59, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                padding: 12px 20px;
                border-left: 4px solid #10b981;
                animation: slideInRight 0.3s ease-out;
                z-index: 1001;
            }
            
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h1>Exchange Rate Manager</h1>
                <div class="version">v3.0 • PREMIUM DESIGN SYSTEM</div>
            </div>
            
            <!-- Main Rate Card -->
            <div class="rate-card">
                <div class="rate-value">
                    <div class="rate-number">1 USD = <?php echo number_format($info['usd_to_bdt'], 2); ?> BDT</div>
                    <div class="rate-label">Live Exchange Rate</div>
                </div>
                <div class="rate-info">
                    <div class="info-item">
                        <div class="info-label">With Platform Fee (<?php echo PLATFORM_FEE_PERCENTAGE; ?>%)</div>
                        <div class="info-value">1 USD = <?php echo number_format($info['usd_to_bdt_with_fee'], 2); ?> BDT</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Profit Margin (30%)</div>
                        <div class="info-value">1 USD = <?php echo number_format($info['usd_to_bdt_profit_margin'], 2); ?> BDT</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Last Updated</div>
                        <div class="info-value success"><?php echo $info['last_updated'] ?? 'Just now'; ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Provider</div>
                        <div class="info-value"><?php echo ucfirst($info['provider']); ?></div>
                    </div>
                </div>
            </div>
            
            <!-- Converter -->
            <div class="converter-card">
                <div class="converter-title">
                    <i class="fas fa-exchange-alt"></i>
                    <span>Currency Converter</span>
                </div>
                <div class="converter-grid">
                    <div class="converter-input">
                        <label>USD</label>
                        <input type="number" id="usdInput" placeholder="0.00" value="1">
                    </div>
                    <div class="converter-switch" onclick="swapCurrencies()">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    <div class="converter-input">
                        <label>BDT</label>
                        <input type="number" id="bdtInput" placeholder="0.00" value="<?php echo number_format($info['usd_to_bdt'], 2); ?>">
                    </div>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-percent"></i>
                    </div>
                    <div class="stat-value"><?php echo PLATFORM_FEE_PERCENTAGE; ?>%</div>
                    <div class="stat-label">Platform Fee</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-chart-simple"></i>
                    </div>
                    <div class="stat-value">30%</div>
                    <div class="stat-label">Profit Margin</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="stat-value"><?php echo round(CACHE_DURATION / 3600, 1); ?>h</div>
                    <div class="stat-label">Cache Duration</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-cloud-arrow-up"></i>
                    </div>
                    <div class="stat-value"><?php echo count(PROVIDERS); ?></div>
                    <div class="stat-label">Rate Providers</div>
                </div>
            </div>
            
            <!-- Conversion Table -->
            <div class="table-card">
                <div class="table-title">
                    <i class="fas fa-table-list"></i>
                    <span>Quick Conversion Guide</span>
                </div>
                <table class="conversion-table">
                    <thead>
                        <tr>
                            <th>USD Amount</th>
                            <th>BDT Amount (Base Rate)</th>
                            <th>BDT Amount (With Fee)</th>
                            <th>BDT Amount (Profit Margin)</th>
                        </tr>
                    </thead>
                    <tbody id="conversionTableBody">
                        <!-- Populated by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <button class="refresh-btn" onclick="refreshRate()">
            <i class="fas fa-sync-alt"></i>
        </button>
        
        <script>
            let currentRate = <?php echo $info['usd_to_bdt']; ?>;
            let rateWithFee = <?php echo $info['usd_to_bdt_with_fee']; ?>;
            let rateWithMargin = <?php echo $info['usd_to_bdt_profit_margin']; ?>;
            
            const usdInput = document.getElementById('usdInput');
            const bdtInput = document.getElementById('bdtInput');
            
            function showToast(message, isError = false) {
                const existingToast = document.querySelector('.toast-notification');
                if (existingToast) existingToast.remove();
                
                const toast = document.createElement('div');
                toast.className = 'toast-notification';
                toast.style.borderLeftColor = isError ? '#ef4444' : '#10b981';
                toast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-${isError ? 'exclamation-triangle' : 'check-circle'}" style="color: ${isError ? '#ef4444' : '#10b981'};"></i>
                        <span style="color: white;">${message}</span>
                    </div>
                `;
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            }
            
            function updateConverter() {
                const usd = parseFloat(usdInput.value) || 0;
                bdtInput.value = (usd * currentRate).toFixed(2);
            }
            
            function updateConverterReverse() {
                const bdt = parseFloat(bdtInput.value) || 0;
                usdInput.value = (bdt / currentRate).toFixed(2);
            }
            
            function swapCurrencies() {
                const usdVal = usdInput.value;
                const bdtVal = bdtInput.value;
                usdInput.value = bdtVal;
                bdtInput.value = usdVal;
                updateConverter();
            }
            
            function updateConversionTable() {
                const amounts = [1, 5, 10, 25, 50, 100, 500, 1000];
                const tbody = document.getElementById('conversionTableBody');
                tbody.innerHTML = amounts.map(usd => `
                    <tr>
                        <td><strong>$${usd}</strong></td>
                        <td>৳${(usd * currentRate).toFixed(2)}</td>
                        <td>৳${(usd * rateWithFee).toFixed(2)}</td>
                        <td>৳${(usd * rateWithMargin).toFixed(2)}</td>
                    </tr>
                `).join('');
            }
            
            async function refreshRate() {
                const btn = document.querySelector('.refresh-btn');
                btn.classList.add('loading');
                
                try {
                    const response = await fetch(window.location.href + '?action=refresh');
                    const data = await response.json();
                    
                    if (data.success) {
                        currentRate = data.usd_to_bdt;
                        rateWithFee = currentRate * <?php echo 1 + (PLATFORM_FEE_PERCENTAGE / 100); ?>;
                        rateWithMargin = currentRate * <?php echo PROFIT_MARGIN; ?>;
                        
                        // Update display
                        document.querySelector('.rate-number').innerHTML = `1 USD = ${currentRate.toFixed(2)} BDT`;
                        document.querySelectorAll('.rate-info .info-value')[0].innerHTML = `1 USD = ${rateWithFee.toFixed(2)} BDT`;
                        document.querySelectorAll('.rate-info .info-value')[1].innerHTML = `1 USD = ${rateWithMargin.toFixed(2)} BDT`;
                        document.querySelectorAll('.rate-info .info-value')[2].innerHTML = 'Just now';
                        document.querySelectorAll('.rate-info .info-value')[3].innerHTML = data.provider || 'api';
                        
                        updateConverter();
                        updateConversionTable();
                        showToast('Exchange rate refreshed successfully!');
                    } else {
                        showToast('Failed to refresh exchange rate', true);
                    }
                } catch (error) {
                    showToast('Network error. Please try again.', true);
                } finally {
                    btn.classList.remove('loading');
                }
            }
            
            // Event listeners
            usdInput.addEventListener('input', updateConverter);
            bdtInput.addEventListener('input', updateConverterReverse);
            
            // Initial setup
            updateConversionTable();
            
            // Auto-refresh every hour
            setInterval(refreshRate, 3600000);
            
            // Keyboard shortcut: Alt+R to refresh
            window.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 'r') {
                    refreshRate();
                }
            });
            
            console.log('💱 BoostBangla Exchange Rate v3.0 loaded');
            console.log('💡 Tip: Press Alt+R to refresh exchange rate');
        </script>
    </body>
    </html>
    <?php
}
?>