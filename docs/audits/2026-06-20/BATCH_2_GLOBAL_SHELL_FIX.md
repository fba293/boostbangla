# BoostBangla Batch 2 - Global Shell Fix

## Completed

- Added public global header loader: public/assets/js/global-header.js.
- Added public global footer loader: public/assets/js/global-footer.js.
- Public pages now use header-placeholder and footer-placeholder with shared component loading.
- Removed repeated public inline footers from public pages.
- Added Admin Panel v2 shared shell: public/assets/js/admin-shell.js.
- Added Admin Panel v2 shared shell CSS: public/assets/css/admin-shell.css.
- Admin pages now get one consistent sidebar and topbar through the shared admin shell.
- Converted invalid admin snippet pages like news.html into valid admin HTML shells.
- Added lightweight dashboard shell files for dashboard consistency.

## Why this matters

Future header, footer, admin sidebar, admin topbar, theme, and mobile-menu changes now happen from global files instead of editing every page one by one.

## Next batch

Batch 3 should focus on Supabase/Firebase decision, auth/data architecture, and dashboard data flow.
