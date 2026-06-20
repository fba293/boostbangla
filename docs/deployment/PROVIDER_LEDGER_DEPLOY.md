# Provider Ledger Deployment

## 1. Configure cPanel environment values

```text
AMARBOOST_API_URL=https://amarboost.com/api/v2
AMARBOOST_API_KEY=your_real_key
DB_HOST=localhost
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=boostbangla
ADMIN_SYNC_SECRET=a_long_random_private_value
FIREBASE_PROJECT_ID=boostbangla-629a1
```

Keep all values outside browser code and public HTML/JavaScript files.

## 2. Refresh the catalogue before enabling orders

Run once through cPanel Terminal or Cron:

```bash
/usr/local/bin/php /home/CPANEL_USER/public_html/public/php/services-sync.php
```

Cron schedule:

```bash
*/10 * * * * /usr/local/bin/php /home/CPANEL_USER/public_html/public/php/services-sync.php >/dev/null 2>&1
*/5 * * * * /usr/local/bin/php /home/CPANEL_USER/public_html/public/php/sync-orders.php --limit=100 --stale_minutes=5 >/dev/null 2>&1
```

## 3. Verify without exposing secrets

```bash
curl -H "X-Admin-Secret: YOUR_ADMIN_SYNC_SECRET" https://YOUR_DOMAIN/public/php/provider-health.php
```

Expected values: success true, provider_configured true, provider_reachable true, service_count greater than zero.

## 4. Verify the dashboard catalogue

Open `/public/php/api-proxy.php?action=services`. Expected live values: is_demo false, ordering_enabled true, provider amarboost.

## 5. Administrator custom claim

`admin-orders.php` requires a Firebase custom claim of either `admin: true` or `role: admin`. Apply the claim through a trusted Firebase Admin SDK process, then sign out and back in.

## 6. Controlled test order

Use a low-cost real service and verify the local order ID, AmarBoost provider order ID, one MySQL wallet transaction, dashboard status, cron updates, and Admin Orders ledger record.
