# Dashboard Device and AmarBoost Provider Status

## Device compatibility

- User dashboard pages include a shared responsive stylesheet and device helper.
- Admin dashboard pages include the shared responsive admin shell and mobile layout layer.
- Shared behavior covers common phone, tablet, laptop, and desktop breakpoints, safe-area padding, dynamic viewport height, off-canvas navigation, responsive tables, modal sizing, dark mode inputs, and reduced-motion preference.

## Secure AmarBoost ordering

- Browser order requests no longer send user balance, calculated rates, service names, or user identifiers as trusted values.
- `public/php/order-handler.php` verifies a Firebase ID token, refreshes the selected AmarBoost service server-side, calculates the price server-side, reserves the MySQL wallet, then sends one direct AmarBoost add request.
- Request IDs make repeated browser submissions idempotent.
- Explicit provider rejection returns the reserved wallet amount.
- Ambiguous network/provider outcomes remain pending confirmation to avoid duplicate AmarBoost orders.
- `public/php/orders.php` provides authenticated order history, transaction history, provider status refresh, and safe cancellation rules.
- Demo provider service data is marked as demo and ordering is blocked until an actual AmarBoost server key is configured.

## Verified locally

- 45 user/admin dashboard pages checked.
- 133 inline scripts parsed with zero syntax errors.
- 1084 internal dashboard/admin references checked with zero missing references.
- Modified PHP files passed PHP lint.
- Secure endpoint behavior verified locally: unauthenticated order and order reads return 401, and the legacy proxy add action returns 405.

## Live verification required

A live AmarBoost order was not placed during local validation because the test environment has no production AmarBoost key, production MySQL database, or signed-in Firebase user. After deployment, request `GET /public/php/order-handler.php?action=health`; `provider_configured` must be true before accepting real orders.
