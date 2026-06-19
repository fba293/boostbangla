# Firebase to PHP Migration TODO

## Priority 1 - COMPLETED ✅
These files have been updated to use PHP backend:
- [x] `/public/pages/dashboard/new-order.html` - Place orders
- [x] `/public/pages/dashboard/orders.html` - View orders

## Priority 2 - Dashboard Pages (Update Next)
These files need Firebase → PHP migration:
- [ ] `/public/pages/dashboard/index.html` - Dashboard stats/orders count
- [ ] `/public/pages/dashboard/order-detail.html` - Order status/details
- [ ] `/public/pages/dashboard/add-funds.html` - Wallet operations
- [ ] `/public/pages/dashboard/mass-order.html` - Bulk orders
- [ ] `/public/pages/dashboard/giveaway.html` - Giveaway orders
- [ ] `/public/pages/dashboard/transactions.html` - Transaction history

## Priority 3 - Admin Pages (Optional)
- [ ] `/public/pages/admin/orders.html` - Admin order management

## Migration Pattern

**Old Firebase Pattern:**
```javascript
const snapshot = await db.collection('orders')
    .where('userId', '==', currentUser.uid)
    .get();
```

**New PHP Pattern:**
```javascript
const response = await fetch(
    `/public/php/api-proxy.php?action=get_user_orders&user_id=${currentUser.uid}`
);
const result = await response.json();
const orders = result.orders || [];
```

## Available API Endpoints

**Already implemented and ready to use:**

1. **Get User Orders**
   ```
   GET /public/php/api-proxy.php?action=get_user_orders&user_id=USER_ID&limit=100
   Response: { success, orders: [...] }
   ```

2. **Get Single Order**
   ```
   GET /public/php/api-proxy.php?action=get_order&order_id=ORDER_ID
   Response: { success, order: {...} }
   ```

3. **Cancel Order**
   ```
   POST /public/php/api-proxy.php
   Data: action=cancel_order&order_id=ORDER_ID
   Response: { success, message, refund_amount }
   ```

4. **Get User Balance**
   ```
   GET /public/php/api-proxy.php?action=get_balance&user_id=USER_ID
   Response: { success, balance, user_id }
   ```

5. **Add Balance**
   ```
   POST /public/php/api-proxy.php
   Data: action=add_balance&user_id=USER_ID&amount=AMOUNT&method=METHOD
   Response: { success, message, new_balance }
   ```

6. **Place Order**
   ```
   POST /public/php/order-handler.php
   Data: action=place_order&user_id=USER_ID&service_id=SERVICE_ID&link=LINK&quantity=QUANTITY
   Response: { success, data: {local_order_id, ...} }
   ```

## Testing After Migration

For each page migrated, verify:
- [ ] Data loads on page load
- [ ] Real-time updates work
- [ ] Errors handled gracefully
- [ ] No console errors
- [ ] User sees correct data

## Notes

- API endpoints are cached (5 min default)
- Use `clear-cache` action to clear if needed
- All endpoints require proper authentication (user_id)
- Database must be initialized first: `php /public/php/database.php`
- Check database.php for connection errors if APIs fail

