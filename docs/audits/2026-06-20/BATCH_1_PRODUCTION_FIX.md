# BoostBangla Batch 1 Production Fix - 20 June 2026

## Completed

- Added root .htaccess route aliases to fix Admin Panel v2 404 errors.
- Mapped clean admin routes to public/pages/admin.
- Mapped clean dashboard routes to public/pages/dashboard.
- Added legacy asset aliases for CSS, JS, images, and assets.
- Added compatibility redirects for old legal, blog, and dashboard links.
- Generated root sitemap.xml in the backup ZIP.
- Updated robots.txt in the backup ZIP.
- Removed Mac junk files, cache JSON files, and PHP log files from the production backup.
- Added gitignore and a safe environment template.
- Sanitized exposed provider credentials from the deployable backup.
- Hardened API proxy CORS to use an allowlist from environment settings.

## Why Admin Panel 404 happened

Admin links used routes such as /admin/users.html and /admin/orders.html, but the real files were stored under public/pages/admin. Without rewrite rules, cPanel searched for non-existing files under /admin and returned 404.

## Next batch

- Normalize global header, sidebar, and footer for public, dashboard, and admin areas.
- Replace duplicated admin sidebar HTML with a shared admin shell.
- Decide Firebase versus Supabase migration path before changing data logic.
