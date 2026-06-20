# Final Ledger Consistency Deployment

## Why this deployment step matters

The user dashboard and admin/provider flow use MySQL as the source of truth for financial orders. Firestore remains available for authentication, public/profile information, deposits, tickets, and notifications, but it must not be used as a second order ledger.

## Deployment order

1. Upload the full package contents to `public_html`.
2. Confirm `.htaccess` and `public/php/.htaccess` uploaded.
3. Set server environment values from `.env.example`.
4. Run the protected database migration once:

```bash
/usr/local/bin/php /home/CPANEL_USER/public_html/public/php/migrate.php
```

5. Refresh live AmarBoost services:

```bash
/usr/local/bin/php /home/CPANEL_USER/public_html/public/php/services-sync.php
```

6. Add the service and order sync cron jobs from `docs/deployment/PROVIDER_SYNC_CRON.md`.
7. Sign into the production user dashboard and perform one low-value controlled AmarBoost test order.

## Verification

- Public service catalogue: `/public/php/api-proxy.php?action=services`
- Protected provider health: `/public/php/provider-health.php` with `X-Admin-Secret`
- User order history: Dashboard Orders
- User order detail: Dashboard Order Detail
- Admin order ledger: Admin Orders

`DB_AUTO_MIGRATE` should remain false in production. It exists only for isolated local development environments.
