# Provider Data Source Status

## Completed in this package

- Server-side catalogue cache is now the only source for dashboard service lists.
- Direct AmarBoost order submission remains server-owned.
- User order refresh is authenticated and local-order scoped.
- Admin orders now use the same MySQL provider ledger as customer orders.
- Provider health is protected from public browser access.
- Legacy provider gateway actions are retired.

## Manual external requirements

- Set real cPanel environment values.
- Run services and order-sync cron jobs.
- Assign real Firebase administrator custom claims.
- Complete one controlled production order test.

No real AmarBoost order was sent from this environment because the real provider key, production MySQL database, and authenticated production account are unavailable here.
