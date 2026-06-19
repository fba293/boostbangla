<?php
// ============================================
// BoostBangla Configuration - Premium Design System v3.0
// Centralized configuration with environment support and validation
// Version: 3.0
// ============================================

// ============================================
// Environment Detection
// ============================================

define('APP_ENV', getenv('APP_ENV') ?: 'production'); // local, development, staging, production
define('APP_DEBUG', in_array(APP_ENV, ['local', 'development']));
define('APP_VERSION', '3.0.0');
define('APP_NAME', 'BoostBangla');
define('APP_URL', getenv('APP_URL') ?: 'https://boostbangla.com');

// ============================================
// Error Reporting
// ============================================

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
} else {
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
}

ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// ============================================
// Timezone & Locale
// ============================================

date_default_timezone_set('Asia/Dhaka');
setlocale(LC_ALL, 'en_US.UTF-8', 'en_US', 'en');

// ============================================
// API Configuration
// ============================================

// Primary API Provider (AmarBoost)
define('AMARBOOST_API_URL', 'https://amarboost.com/api/v2');
define('AMARBOOST_API_KEY', 'b16011ef550d30af27e306d128747cee');

// Secondary API Provider (SMMSun)
define('SMMSUN_API_URL', 'https://smmsun.com/api/v2');
define('SMMSUN_API_KEY', 'eb1ee371938ee0c485a2dd61f5906fa4');

// Tertiary API Provider (QuickPanely)
define('QUICKPANELY_API_URL', 'https://quickpanely.com/api/v2');
define('QUICKPANELY_API_KEY', 'b26a4bdc07432d7fcbce9fa2153a2a9f');

// API Settings
define('API_TIMEOUT', 30);
define('API_RETRY_COUNT', 3);
define('API_RETRY_DELAY', 1); // seconds

// ============================================
// Pricing Configuration
// ============================================

// Exchange Rate (USD to BDT)
define('USD_TO_BDT', 120);

// Profit Margin (30% = 1.30)
define('PROFIT_MARGIN', 1.30);

// Platform Fee (5% = 1.05)
define('PLATFORM_FEE', 1.05);

// Minimum Order Amounts
define('MIN_ORDER_AMOUNT_BDT', 10);
define('MIN_ORDER_AMOUNT_USD', 0.10);
define('MIN_QUANTITY', 1);
define('MAX_QUANTITY', 10000000);

// ============================================
// Database Configuration (Firebase)
// ============================================

define('FIREBASE_PROJECT_ID', 'boostbangla-629a1');
define('FIREBASE_API_KEY', 'AIzaSyDypaa-pHjEc4rrXHrtj8i_8vgo_5XMY9g');
define('FIREBASE_AUTH_DOMAIN', 'boostbangla-629a1.firebaseapp.com');
define('FIREBASE_DATABASE_URL', 'https://boostbangla-629a1-default-rtdb.firebaseio.com');
define('FIREBASE_STORAGE_BUCKET', 'boostbangla-629a1.firebasestorage.app');

// Firestore Collections
define('FIREBASE_COLLECTION_USERS', 'users');
define('FIREBASE_COLLECTION_ORDERS', 'orders');
define('FIREBASE_COLLECTION_SERVICES', 'services');
define('FIREBASE_COLLECTION_DEPOSITS', 'deposits');
define('FIREBASE_COLLECTION_TICKETS', 'support_tickets');

// ============================================
// Cache Configuration
// ============================================

define('CACHE_ENABLED', true);
define('CACHE_DRIVER', 'file'); // file, redis, memcached
define('CACHE_DIR', __DIR__ . '/../cache/');
define('CACHE_DURATION', 300); // 5 minutes
define('CACHE_DURATION_LONG', 3600); // 1 hour
define('CACHE_DURATION_SHORT', 60); // 1 minute

// Redis Configuration (if used)
define('REDIS_HOST', getenv('REDIS_HOST') ?: '127.0.0.1');
define('REDIS_PORT', getenv('REDIS_PORT') ?: 6379);
define('REDIS_PASSWORD', getenv('REDIS_PASSWORD') ?: '');
define('REDIS_DB', 0);

// ============================================
// Session Configuration
// ============================================

define('SESSION_NAME', 'boostbangla_session');
define('SESSION_LIFETIME', 7200); // 2 hours
define('SESSION_SECURE', APP_ENV === 'production');
define('SESSION_HTTP_ONLY', true);
define('SESSION_SAME_SITE', 'Lax');

// ============================================
// Security Configuration
// ============================================

// CSRF Protection
define('CSRF_ENABLED', true);
define('CSRF_TOKEN_NAME', 'csrf_token');

// Password Hashing
define('PASSWORD_ALGO', PASSWORD_BCRYPT);
define('PASSWORD_COST', 12);

// JWT Configuration
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-super-secret-jwt-key-change-in-production');
define('JWT_ALGO', 'HS256');
define('JWT_EXPIRY', 86400); // 24 hours

// Rate Limiting
define('RATE_LIMIT_ENABLED', true);
define('RATE_LIMIT_REQUESTS', 100); // per minute
define('RATE_LIMIT_WINDOW', 60); // seconds

// Allowed Origins (CORS)
define('CORS_ALLOWED_ORIGINS', [
    'https://boostbangla.com',
    'https://www.boostbangla.com',
    'https://admin.boostbangla.com',
    'http://localhost:3000',
    'http://localhost:5500'
]);

// ============================================
// Payment Gateway Configuration
// ============================================

// bKash
define('BKASH_ENABLED', true);
define('BKASH_SANDBOX', APP_ENV !== 'production');
define('BKASH_APP_KEY', getenv('BKASH_APP_KEY') ?: '');
define('BKASH_APP_SECRET', getenv('BKASH_APP_SECRET') ?: '');
define('BKASH_USERNAME', getenv('BKASH_USERNAME') ?: '');
define('BKASH_PASSWORD', getenv('BKASH_PASSWORD') ?: '');
define('BKASH_BASE_URL', APP_ENV === 'production' 
    ? 'https://tokenized.pay.bka.sh/v1.2.0-beta' 
    : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta');

// Nagad
define('NAGAD_ENABLED', true);
define('NAGAD_SANDBOX', APP_ENV !== 'production');
define('NAGAD_MERCHANT_ID', getenv('NAGAD_MERCHANT_ID') ?: '');
define('NAGAD_PUBLIC_KEY', getenv('NAGAD_PUBLIC_KEY') ?: '');
define('NAGAD_PRIVATE_KEY', getenv('NAGAD_PRIVATE_KEY') ?: '');
define('NAGAD_BASE_URL', APP_ENV === 'production' 
    ? 'https://api.nagad.com/v1' 
    : 'https://sandbox.nagad.com/v1');

// Rocket
define('ROCKET_ENABLED', true);
define('ROCKET_SANDBOX', APP_ENV !== 'production');
define('ROCKET_MERCHANT_ID', getenv('ROCKET_MERCHANT_ID') ?: '');
define('ROCKET_API_KEY', getenv('ROCKET_API_KEY') ?: '');
define('ROCKET_BASE_URL', APP_ENV === 'production' 
    ? 'https://api.rocket.com/v1' 
    : 'https://sandbox.rocket.com/v1');

// ============================================
// Notification Configuration
// ============================================

// Email (SMTP)
define('MAIL_ENABLED', true);
define('MAIL_HOST', getenv('MAIL_HOST') ?: 'smtp.gmail.com');
define('MAIL_PORT', getenv('MAIL_PORT') ?: 587);
define('MAIL_USERNAME', getenv('MAIL_USERNAME') ?: '');
define('MAIL_PASSWORD', getenv('MAIL_PASSWORD') ?: '');
define('MAIL_ENCRYPTION', getenv('MAIL_ENCRYPTION') ?: 'tls');
define('MAIL_FROM_ADDRESS', getenv('MAIL_FROM_ADDRESS') ?: 'noreply@boostbangla.com');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'BoostBangla');

// SMS
define('SMS_ENABLED', false);
define('SMS_PROVIDER', 'ssl'); // ssl, twilio, nexmo
define('SMS_API_KEY', getenv('SMS_API_KEY') ?: '');
define('SMS_SENDER_ID', getenv('SMS_SENDER_ID') ?: 'BoostBangla');

// Web Push Notifications
define('WEB_PUSH_ENABLED', true);
define('VAPID_PUBLIC_KEY', getenv('VAPID_PUBLIC_KEY') ?: '');
define('VAPID_PRIVATE_KEY', getenv('VAPID_PRIVATE_KEY') ?: '');

// ============================================
// Design System Configuration
// ============================================

// Brand Colors
define('BRAND_PRIMARY', '#FF6B00');
define('BRAND_PRIMARY_DARK', '#CC5500');
define('BRAND_PRIMARY_LIGHT', '#FF8C42');
define('BRAND_SECONDARY', '#02101A');

// Dark Mode
define('DARK_MODE_DEFAULT', false);
define('DARK_MODE_PERSISTENT', true);

// Animations
define('ANIMATIONS_ENABLED', true);
define('ANIMATION_DURATION', 300); // milliseconds

// ============================================
// Feature Flags
// ============================================

define('FEATURE_OFFLINE_MODE', true);
define('FEATURE_BATCH_ORDERS', true);
define('FEATURE_API_ACCESS', true);
define('FEATURE_REFERRAL_SYSTEM', false);
define('FEATURE_AFFILIATE_PROGRAM', false);
define('FEATURE_BULK_UPLOAD', true);
define('FEATURE_EXPORT_ORDERS', true);
define('FEATURE_DARK_MODE', true);
define('FEATURE_TOUR_GUIDE', true);
define('FEATURE_LIVE_CHAT', false);
define('FEATURE_ANALYTICS', true);
define('FEATURE_HEATMAP', true);

// ============================================
// Validation Functions
// ============================================

class ConfigValidator {
    
    /**
     * Validate required configuration values
     */
    public static function validate() {
        $errors = [];
        $warnings = [];
        
        // Check API keys in production
        if (APP_ENV === 'production') {
            if (AMARBOOST_API_KEY === 'b16011ef550d30af27e306d128747cee') {
                $warnings[] = 'Using default AmarBoost API key in production. Consider rotating for security.';
            }
            
            if (JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
                $errors[] = 'JWT_SECRET must be changed in production!';
            }
        }
        
        // Check required directories
        $directories = [CACHE_DIR, __DIR__ . '/logs'];
        foreach ($directories as $dir) {
            if (!file_exists($dir)) {
                if (!mkdir($dir, 0755, true)) {
                    $errors[] = "Cannot create directory: $dir";
                }
            }
            if (!is_writable($dir)) {
                $errors[] = "Directory not writable: $dir";
            }
        }
        
        // Check PHP extensions
        $requiredExtensions = ['curl', 'json', 'openssl'];
        foreach ($requiredExtensions as $ext) {
            if (!extension_loaded($ext)) {
                $errors[] = "Required PHP extension not loaded: $ext";
            }
        }
        
        // Log warnings and errors
        if (!empty($warnings) && APP_DEBUG) {
            error_log("Config Warnings: " . implode(', ', $warnings));
        }
        
        if (!empty($errors)) {
            throw new Exception("Config Errors: " . implode(', ', $errors));
        }
        
        return ['valid' => empty($errors), 'warnings' => $warnings, 'errors' => $errors];
    }
    
    /**
     * Get configuration summary
     */
    public static function getSummary() {
        return [
            'app' => [
                'name' => APP_NAME,
                'version' => APP_VERSION,
                'environment' => APP_ENV,
                'debug' => APP_DEBUG
            ],
            'api' => [
                'providers' => [
                    'amarboost' => !empty(AMARBOOST_API_KEY),
                    'smmsun' => !empty(SMMSUN_API_KEY),
                    'quickpanely' => !empty(QUICKPANELY_API_KEY)
                ],
                'timeout' => API_TIMEOUT,
                'retry_count' => API_RETRY_COUNT
            ],
            'pricing' => [
                'usd_to_bdt' => USD_TO_BDT,
                'profit_margin' => (PROFIT_MARGIN - 1) * 100 . '%',
                'platform_fee' => (PLATFORM_FEE - 1) * 100 . '%',
                'min_order_bdt' => MIN_ORDER_AMOUNT_BDT
            ],
            'cache' => [
                'enabled' => CACHE_ENABLED,
                'driver' => CACHE_DRIVER,
                'duration' => CACHE_DURATION . ' seconds'
            ],
            'features' => [
                'offline_mode' => FEATURE_OFFLINE_MODE,
                'dark_mode' => FEATURE_DARK_MODE,
                'api_access' => FEATURE_API_ACCESS,
                'analytics' => FEATURE_ANALYTICS
            ],
            'design_system' => [
                'version' => '3.0',
                'primary_color' => BRAND_PRIMARY,
                'animations' => ANIMATIONS_ENABLED
            ]
        ];
    }
    
    /**
     * Get environment-specific configuration
     */
    public static function getEnvironmentConfig() {
        $configs = [
            'local' => [
                'debug' => true,
                'cache_enabled' => false,
                'api_timeout' => 60
            ],
            'development' => [
                'debug' => true,
                'cache_enabled' => true,
                'api_timeout' => 45
            ],
            'staging' => [
                'debug' => false,
                'cache_enabled' => true,
                'api_timeout' => 30
            ],
            'production' => [
                'debug' => false,
                'cache_enabled' => true,
                'api_timeout' => 30
            ]
        ];
        
        return $configs[APP_ENV] ?? $configs['production'];
    }
}

// ============================================
// Configuration Helper Functions
// ============================================

/**
 * Get configuration value
 */
function config($key, $default = null) {
    $constant = strtoupper($key);
    return defined($constant) ? constant($constant) : $default;
}

/**
 * Check if feature is enabled
 */
function is_feature_enabled($feature) {
    $constant = 'FEATURE_' . strtoupper($feature);
    return defined($constant) && constant($constant);
}

/**
 * Get API provider configuration
 */
function get_api_provider($provider = 'amarboost') {
    $providers = [
        'amarboost' => [
            'url' => AMARBOOST_API_URL,
            'key' => AMARBOOST_API_KEY,
            'enabled' => !empty(AMARBOOST_API_KEY)
        ],
        'smmsun' => [
            'url' => SMMSUN_API_URL,
            'key' => SMMSUN_API_KEY,
            'enabled' => !empty(SMMSUN_API_KEY)
        ],
        'quickpanely' => [
            'url' => QUICKPANELY_API_URL,
            'key' => QUICKPANELY_API_KEY,
            'enabled' => !empty(QUICKPANELY_API_KEY)
        ]
    ];
    
    return $providers[$provider] ?? null;
}

/**
 * Get all active providers
 */
function get_active_providers() {
    $providers = [];
    foreach (['amarboost', 'smmsun', 'quickpanely'] as $provider) {
        $config = get_api_provider($provider);
        if ($config && $config['enabled']) {
            $providers[$provider] = $config;
        }
    }
    return $providers;
}

/**
 * Get pricing configuration
 */
function get_pricing_config() {
    return [
        'usd_to_bdt' => USD_TO_BDT,
        'profit_margin' => PROFIT_MARGIN,
        'platform_fee' => PLATFORM_FEE,
        'min_order_bdt' => MIN_ORDER_AMOUNT_BDT,
        'min_order_usd' => MIN_ORDER_AMOUNT_USD
    ];
}

// ============================================
// Auto-validation on Load (Non-production only)
// ============================================

if (APP_DEBUG) {
    try {
        ConfigValidator::validate();
    } catch (Exception $e) {
        error_log("Config Validation Error: " . $e->getMessage());
        if (php_sapi_name() === 'cli') {
            echo "ERROR: " . $e->getMessage() . "\n";
        }
    }
}

// ============================================
// Configuration Status Endpoint (when accessed directly)
// ============================================

if (php_sapi_name() !== 'cli' && basename($_SERVER['PHP_SELF']) === 'config.php') {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    
    $secret = $_GET['secret'] ?? '';
    $showSensitive = $secret === 'boostbangla_admin_2024';
    
    $status = [
        'success' => true,
        'app' => [
            'name' => APP_NAME,
            'version' => APP_VERSION,
            'environment' => APP_ENV,
            'debug' => APP_DEBUG,
            'timezone' => date_default_timezone_get()
        ],
        'api' => [
            'providers' => array_keys(get_active_providers()),
            'timeout' => API_TIMEOUT,
            'retry_count' => API_RETRY_COUNT
        ],
        'pricing' => [
            'usd_to_bdt' => USD_TO_BDT,
            'profit_margin' => (PROFIT_MARGIN - 1) * 100 . '%',
            'platform_fee' => (PLATFORM_FEE - 1) * 100 . '%'
        ],
        'cache' => [
            'enabled' => CACHE_ENABLED,
            'driver' => CACHE_DRIVER,
            'directory_writable' => is_writable(CACHE_DIR)
        ],
        'features' => [
            'offline_mode' => FEATURE_OFFLINE_MODE,
            'dark_mode' => FEATURE_DARK_MODE,
            'api_access' => FEATURE_API_ACCESS,
            'analytics' => FEATURE_ANALYTICS
        ],
        'design_system' => [
            'version' => '3.0',
            'primary_color' => BRAND_PRIMARY,
            'animations' => ANIMATIONS_ENABLED
        ],
        'timestamp' => date('c')
    ];
    
    if ($showSensitive) {
        $status['sensitive'] = [
            'api_keys' => [
                'amarboost' => AMARBOOST_API_KEY,
                'smmsun' => SMMSUN_API_KEY,
                'quickpanely' => QUICKPANELY_API_KEY
            ],
            'firebase' => [
                'api_key' => FIREBASE_API_KEY,
                'project_id' => FIREBASE_PROJECT_ID
            ]
        ];
    }
    
    echo json_encode($status, JSON_PRETTY_PRINT);
    exit();
}

// ============================================
// Environment Configuration Check
// ============================================

/**
 * Check if running in production
 */
function is_production() {
    return APP_ENV === 'production';
}

/**
 * Check if running in development
 */
function is_development() {
    return in_array(APP_ENV, ['local', 'development']);
}

/**
 * Get environment name
 */
function get_environment() {
    return APP_ENV;
}

// Log configuration status in debug mode
if (APP_DEBUG) {
    error_log(sprintf(
        '[BoostBangla] Config loaded - Environment: %s, Version: %s, Debug: %s',
        APP_ENV,
        APP_VERSION,
        APP_DEBUG ? 'ON' : 'OFF'
    ));
}
?>