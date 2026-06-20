<?php
/**
 * Secure AmarBoost service cache refresh.
 * Run every 10-15 minutes through cPanel cron, or with X-Admin-Secret.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/provider-client.php';

bb_security_headers(true);
bb_apply_cors('GET, POST, OPTIONS');
bb_require_admin_secret_or_cli();

function bb_service_sync_price($rateUsd) {
    $providerBdt = round(max(0, (float)$rateUsd) * USD_TO_BDT, 4);
    $userBdt = round($providerBdt * PROFIT_MARGIN * PLATFORM_FEE, 4);
    return [$providerBdt, $userBdt];
}

try {
    $provider = new BoostBanglaProviderClient();
    if (!$provider->configured()) bb_fail('AMARBOOST_API_KEY is not configured in the server environment.', 503, ['provider_configured'=>false]);
    $reply = $provider->services();
    if (!$reply['ok']) bb_fail('AmarBoost service refresh failed: ' . $reply['error'], 502, ['provider_configured'=>true]);
    $items = $reply['data']['services'] ?? (is_array($reply['data']) ? $reply['data'] : []);
    if (!is_array($items)) bb_fail('AmarBoost returned an invalid services response.', 502);

    $db = Database::getInstance();
    $db->beginTransaction();
    $synced = 0;
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $serviceId = $item['service'] ?? $item['id'] ?? $item['service_id'] ?? null;
        if (!ctype_digit((string)$serviceId)) continue;
        $name = substr(trim((string)($item['name'] ?? 'AmarBoost service')), 0, 255);
        if ($name === '') continue;
        $category = substr(trim((string)($item['category'] ?? 'other')), 0, 100);
        $rateUsd = max(0, (float)($item['rate'] ?? $item['price'] ?? 0));
        [$providerBdt, $userBdt] = bb_service_sync_price($rateUsd);
        $markup = $providerBdt > 0 ? (int)round((($userBdt / $providerBdt) - 1) * 100) : 0;
        $min = max(1, (int)($item['min'] ?? $item['min_order'] ?? 1));
        $max = max($min, (int)($item['max'] ?? $item['max_order'] ?? 100000));
        $db->execute(
            'INSERT INTO services_cache (service_id, service_name, category, base_rate, user_price, amarboost_price, markup_percent, min_order, max_order, is_active, provider_name, provider_checked_at, provider_raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), ?) ON DUPLICATE KEY UPDATE service_name=VALUES(service_name), category=VALUES(category), base_rate=VALUES(base_rate), user_price=VALUES(user_price), amarboost_price=VALUES(amarboost_price), markup_percent=VALUES(markup_percent), min_order=VALUES(min_order), max_order=VALUES(max_order), is_active=1, provider_name=VALUES(provider_name), provider_checked_at=NOW(), provider_raw=VALUES(provider_raw), updated_at=NOW()',
            'issdddiiiss', [(int)$serviceId, $name, $category, $rateUsd, $userBdt, $providerBdt, $markup, $min, $max, 'amarboost', json_encode($item)]
        );
        $synced++;
    }
    $db->commit();
    bb_json(['success'=>true,'provider_configured'=>true,'services_synced'=>$synced,'time'=>gmdate('c')]);
} catch (Throwable $error) {
    try { if (isset($db)) $db->rollback(); } catch (Throwable $ignored) {}
    error_log('BoostBangla services-sync failed: ' . $error->getMessage());
    bb_fail('Service refresh failed. Check protected server logs.', 500, ['code'=>'SERVICE_SYNC_FAILURE']);
}
