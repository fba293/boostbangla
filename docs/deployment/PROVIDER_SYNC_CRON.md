# AmarBoost Sync Cron

Run these from cPanel Cron Jobs. Use the PHP binary path provided by your host.

```bash
*/10 * * * * /usr/local/bin/php /home/CPANEL_USER/public_html/public/php/services-sync.php >/dev/null 2>&1
*/5 * * * * /usr/local/bin/php /home/CPANEL_USER/public_html/public/php/sync-orders.php --limit=100 --stale_minutes=5 >/dev/null 2>&1
```

Replace `CPANEL_USER` and the PHP path with values from cPanel. Both scripts are MySQL-first and call AmarBoost only from the server. Do not call `sync-engine.php`; it is intentionally retired.

For a protected manual test, use `X-Admin-Secret` with `services-sync.php` or `sync-orders.php`. Never put `ADMIN_SYNC_SECRET` in browser code.
