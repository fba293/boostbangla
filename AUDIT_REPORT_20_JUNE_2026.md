# BoostBangla Full File Audit - 20 June 2026

## Executive Summary

I audited the uploaded BoostBangla backup ZIP. The main reason Admin Panel v2 pages show 404 is not a page-code bug; it is a routing and deployment path mismatch. Admin navigation points to /admin/*.html, but the real files are inside public/pages/admin/*.html, and no .htaccess file exists to map those routes.

## Audit Scope

- HTML files scanned: 65
- CSS files scanned: 11
- Internal references scanned: 993
- Missing references if the ZIP root is webroot: 397
- Missing references if /public is webroot: 953
- Mac/junk files found: 188
- Log files found: 9
- Cache files found: 14

## Critical Finding: Why Admin Panel Shows 404

Admin pages exist here:

```text
public/pages/admin/index.html
public/pages/admin/users.html
public/pages/admin/orders.html
public/pages/admin/deposits.html
public/pages/admin/services.html
public/pages/admin/settings.html
```

But the admin navigation uses URLs like:

```text
/admin/index.html
/admin/users.html
/admin/orders.html
/admin/deposits.html
/admin/tickets.html
/admin/refunds.html
/admin/withdrawals.html
/admin/services.html
/admin/settings.html
/dashboard/index.html
```

Because no .htaccess exists, Apache/cPanel looks for real files like /admin/orders.html. Those files do not exist at that path, so it returns 404.

## Priority Issues

### 1. [CRITICAL] Admin routing

- Problem: Admin pages link to /admin/*.html but actual files are stored under public/pages/admin/*.html and no .htaccess exists.
- Evidence: 199 /admin/ links found; 31 links to /admin/index.html; no .htaccess file found in package.
- Impact: Only the exact dashboard URL works; other admin pages return cPanel 404 because Apache searches for non-existing /admin files.
- Recommendation: Either rewrite /admin/* to /public/pages/admin/*, or change every admin link to the real deployed path and standardize deployment root.

### 2. [CRITICAL] Asset routing

- Problem: Many pages reference /css/* and /js/* but assets are in public/assets/css and public/assets/js.
- Evidence: 76 /css/ references and 15 /js/core/notifications-helper.js references are missing under root deployment.
- Impact: Admin pages can load without CSS/JS, causing broken layout, missing functionality, and runtime errors.
- Recommendation: Create rewrite aliases for /css, /js, /images or replace all references with /public/assets/... consistently.

### 3. [CRITICAL] Secrets

- Problem: Provider API keys and JWT fallback secret are hardcoded in public PHP/config files and setup docs.
- Evidence: Sensitive constants detected in public/php/config.php, public/php/api-proxy.php, public/php/sync-orders.php, setup scripts, and admin settings text.
- Impact: Anyone with repo/server access can copy provider keys and abuse SMM APIs or impersonate backend calls.
- Recommendation: Rotate exposed provider keys immediately; move secrets to .env outside public webroot; never commit secrets to GitHub.

### 4. [HIGH] Public PHP exposure

- Problem: PHP proxy and backend logic sit under public/php and use wildcard CORS.
- Evidence: api-proxy.php sends Access-Control-Allow-Origin: * and supports external provider calls.
- Impact: Attackers may call proxy endpoints directly if actions are not strongly authenticated server-side.
- Recommendation: Move backend PHP outside public when possible; enforce session/admin/auth checks; restrict CORS to your domains only.

### 5. [HIGH] Repository hygiene

- Problem: Mac metadata, cache files, and logs are included in the deployable package.
- Evidence: 188 junk files, 9 log files, and 14 cache files found.
- Impact: Unnecessary files bloat deployment and logs/cache may reveal operational details or stale data.
- Recommendation: Delete __MACOSX, .DS_Store, logs, and cache before production; add them to .gitignore.

### 6. [HIGH] Missing referenced pages

- Problem: Several links point to files that do not exist.
- Evidence: Missing examples include /public/pages/public/terms-of-service.html, /public/pages/public/privacy-policy.html, /public/pages/dashboard/faq.html, /blog-single.html, /sitemap.xml.
- Impact: Users and crawlers hit 404s from footer, public pages, dashboard links, and blog links.
- Recommendation: Rename links to existing files or create compatibility redirects/alias pages for old URLs.

### 7. [HIGH] Duplicate root strategy

- Problem: There are multiple index.html files and public folder duplication without one clear webroot.
- Evidence: index.html exists at root, public/index.html, public/pages/public/index.html, admin index, dashboard index.
- Impact: cPanel routing becomes unpredictable; links behave differently depending on upload folder and document root.
- Recommendation: Choose one deployment strategy: root webroot with /public aliases, or public as document root with cleaned paths.

### 8. [HIGH] Component architecture

- Problem: Dashboard pages fetch shared components, admin pages repeat inline sidebar/header, and public pages use mixed patterns.
- Evidence: Dashboard pages fetch /public/components/sidebar.html and universal-header.html; admin pages embed repeated admin-sidebar markup.
- Impact: Global UI changes require editing many files, increasing bugs and inconsistent navigation.
- Recommendation: Create admin-global-header.js/sidebar.js and dashboard-global-sidebar.js, or one role-aware shell loader.

### 9. [MEDIUM] Firebase/Supabase mismatch

- Problem: Current code still depends heavily on Firebase while the project now has a Supabase URL/key.
- Evidence: Firebase config appears in many admin, dashboard, and public auth pages; no Supabase client was found in uploaded files.
- Impact: Backend direction is unclear and future auth/data changes may split data across platforms.
- Recommendation: Decide migration path: keep Firebase, or create Supabase schema/auth/storage and migrate page logic gradually.

### 10. [MEDIUM] SEO files

- Problem: robots.txt exists but sitemap.xml is referenced and missing from root package.
- Evidence: robots.txt points to https://boostbangla.com/sitemap.xml; link audit found /sitemap.xml missing.
- Impact: Search engines and AI crawlers lose structured discovery of public pages.
- Recommendation: Generate sitemap.xml at root and keep public sitemap.html only as a visual page.

### 11. [MEDIUM] Mixed Firebase versions

- Problem: Firebase v8 is used broadly but v10 appears in one public page.
- Evidence: 39 uses of Firebase 8.10.1 and one use of Firebase 10.8.0 were detected.
- Impact: Mixing SDK styles can break auth logic if scripts or code patterns are copied between pages.
- Recommendation: Standardize one SDK version and one shared auth module.

### 12. [MEDIUM] Service worker

- Problem: sw.js only installs/activates and has no fetch caching or versioning.
- Evidence: sw.js contains skipWaiting and clients.claim only.
- Impact: No offline or performance benefit, and future caching bugs are harder to manage without versioning.
- Recommendation: Either remove it until needed or implement versioned cache strategy with safe invalidation.

### 13. [MEDIUM] Admin access control

- Problem: Admin pages are static HTML with Firebase checks repeated client-side.
- Evidence: Admin UI files are directly accessible if URL routing works; protection depends on page JavaScript.
- Impact: Client-side-only admin checks do not secure backend endpoints or data by themselves.
- Recommendation: Enforce admin authorization in Firebase rules/Supabase RLS/PHP endpoints, not only in frontend JavaScript.

### 14. [LOW] Generated/old files

- Problem: Build scripts, migration docs, duplicate modules, and generated service dumps are mixed into production package.
- Evidence: Examples: build folder, setup-middleman.sh, generate-all.js, services copy.html, multiple docs and old implementation files.
- Impact: Production upload becomes confusing and may expose internal work-in-progress details.
- Recommendation: Separate source repository from deploy output; ship only required runtime files to cPanel.

## Safe .htaccess Patch for Current ZIP-Root Deployment

Use this only if the entire ZIP structure is uploaded to public_html and public/ remains a folder inside it.

```apache
Options -Indexes
RewriteEngine On

# Existing files/folders load normally
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Admin and user dashboard route aliases
RewriteRule ^admin/?$ /public/pages/admin/index.html [L]
RewriteRule ^admin/(.+)$ /public/pages/admin/$1 [L]
RewriteRule ^dashboard/?$ /public/pages/dashboard/index.html [L]
RewriteRule ^dashboard/(.+)$ /public/pages/dashboard/$1 [L]

# Asset aliases for older pages
RewriteRule ^css/(.+)$ /public/assets/css/$1 [L]
RewriteRule ^js/(.+)$ /public/assets/js/$1 [L]
RewriteRule ^images/(.+)$ /public/assets/images/$1 [L]

# Public page compatibility aliases
RewriteRule ^services.html$ /public/pages/public/services.html [L]
RewriteRule ^pricing.html$ /public/pages/public/pricing.html [L]
RewriteRule ^about.html$ /public/pages/public/about.html [L]
RewriteRule ^contact.html$ /public/pages/public/contact.html [L]
RewriteRule ^blog.html$ /public/pages/public/blog.html [L]
RewriteRule ^faq.html$ /public/pages/public/faq.html [L]
RewriteRule ^login.html$ /public/pages/public/login.html [L]
RewriteRule ^signup.html$ /public/pages/public/signup.html [L]
RewriteRule ^terms-of-service.html$ /public/pages/public/terms.html [L]
RewriteRule ^privacy-policy.html$ /public/pages/public/privacy.html [L]
RewriteRule ^refund-policy.html$ /public/pages/public/refund-policy.html [L]
```

## Best Long-Term Fix

Do not depend only on rewrite aliases forever. The clean production solution is to choose one webroot strategy and normalize every path.

## Immediate Fix Order

1. Rotate the exposed SMM provider API keys before pushing this code anywhere public.
2. Add .htaccess route aliases so admin/dashboard pages stop showing 404 immediately.
3. Fix /css, /js, and /images asset aliases or update all references to /public/assets paths.
4. Remove logs, cache, __MACOSX, .DS_Store, and setup/internal files from production upload.
5. Generate sitemap.xml and fix old legal URLs: terms-of-service.html and privacy-policy.html.
6. Standardize global header/sidebar/footer architecture for admin, dashboard, and public pages.
7. Decide Firebase versus Supabase before changing dashboard data flow.

## Notes

I did not include raw secret values in this report. The audit detected exposed provider keys and Firebase config, so rotate provider keys before public GitHub deployment.
