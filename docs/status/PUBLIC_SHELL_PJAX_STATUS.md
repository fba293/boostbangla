# Public Shell PJAX Status

## Completed

- Universal public header is loaded once and persists while public page content changes.
- Universal public footer is loaded once and persists while public page content changes.
- Public links use a history-aware PJAX router with prefetch on hover/touch, browser back/forward support, scroll restoration, view transitions where supported, and full-navigation fallback.
- Public page-specific head styles and body scripts are updated after a PJAX swap.
- The old per-page header fetch scripts were removed from public content pages.
- The duplicate bespoke header/mobile drawer on the home page was removed.
- Header navigation text links are icon-free in desktop and mobile navigation.
- The footer newsletter / Growth Tips section was removed.

## Scope

PJAX applies to public pages only. Admin and customer dashboard routes keep their authenticated application shells and normal navigation unless deliberately migrated later.

## Validation

- Public pages with a PJAX root: 14
- Pages with exactly one header mount and footer mount: 14
- Remaining public inline component header fetchers: 0
- Header navigation icons: 0
- Newsletter text/form controls in universal footer: 0
- New shell JavaScript syntax errors: 0

## Browser note

Chromium was available for audit, but this execution environment blocked local browser navigation before page load with ERR_BLOCKED_BY_ADMINISTRATOR. Static lifecycle and local HTTP reachability checks completed successfully. Live behavior should be confirmed after deployment on the actual domain.
