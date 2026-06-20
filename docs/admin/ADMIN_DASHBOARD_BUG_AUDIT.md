# Admin Dashboard Bug Audit and Repair

## Bugs found and repaired

1. Admin routes could be shadowed by a legacy root folder because rewrites ran after the existing-folder check. The routing rules now run first.
2. Admin pages relied on duplicated legacy sidebars, headers, mobile buttons, and per-page Firebase initialization. A single responsive admin shell now owns shared chrome.
3. The admin shell could nest a main element inside another main element on newly created manager screens. It now reuses an existing main element safely.
4. Admin pages had no effective role guard. A role-aware Firebase-first controller now verifies legacy isAdmin, role values, and Firebase custom claims.
5. The Admin Blog file was a public marketing blog instead of a manager. It is now connected to Firestore blogPosts draft/published records and the public blog feed.
6. The Admin News file was only a code sample. It is now connected to Firestore news announcements and the user dashboard announcement banner.
7. Mobile tables, modals, dark form fields, grids, and sidebar state were inconsistent. Shared responsive admin CSS now protects the layouts.
8. Admin Add Funds previously trusted a browser-side balance update. It now uses a protected callable function with a server-side MySQL wallet credit and Firestore mirror.
9. Retrying a wallet request could risk duplicate credit. The callable function now uses an idempotency request identifier and MySQL transaction references.
10. Firestore rules and indexes were absent. Firebase deployment source now defines role-aware rules and common admin/dashboard query indexes.

## Connected flows

- Admin Blog Manager -> Firestore blogPosts -> public blog dynamic feed.
- Admin News Manager -> Firestore news -> user dashboard announcement banner.
- Admin Add Funds -> callable adminAdjustWallet -> MySQL user_wallets/order_transactions -> Firestore users/adminTransactions mirror.

## Required deployment

Run firebase deploy for Firestore rules, indexes, and functions. The callable function also needs a Firebase administrator custom claim and MySQL environment values in Firebase Functions.
