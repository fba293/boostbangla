# Provider Sync Reliability Status

## Completed

- Replaced the old Firestore REST synchronizer with a MySQL-first secure AmarBoost status cron.
- Added a server-only AmarBoost service-cache refresh cron.
- Retired `sync-engine.php`; it now returns a protected 410 response.
- Added authenticated POST-only user order refresh with a 20-second local-status cooldown.
- Added a shared server-only provider client and blocked direct web access to it.
- Corrected the database CLI include bug that previously auto-opened MySQL whenever `database.php` was included in a cron script.
- Removed the direct configuration status URL that could expose operational information.
- Removed the remaining TLS-verification-disabled exchange-rate provider request.

## Deployment

Use the cron commands in `docs/deployment/PROVIDER_SYNC_CRON.md`. A live provider order has not been executed in this environment because production credentials and an authenticated user are unavailable.
