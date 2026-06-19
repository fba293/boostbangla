# BoostBangla Middleman - API Reference & Testing Guide

## 🧪 Testing the System

### Test 1: Database Connection
```bash
php /path/to/public/php/database.php
```
**Expected Output:**
```
✅ Database schema initialized successfully!
```

---

## 📡 API Endpoints

### Place Order
**Endpoint:** `POST /php/order-handler.php`

**Parameters:**
```
action=place_order
user_id=user123
service_id=1001
link=https://instagram.com/post/12345
quantity=100
custom_data=optional
```

**cURL Example:**
```bash
curl -X POST http://localhost/php/order-handler.php \
  -d "action=place_order" \
  -d "user_id=user123" \
  -d "service_id=1001" \
  -d "link=https://instagram.com/post/12345" \
  -d "quantity=100"
```

**Success Response:**
```json
{
  "success": true,
  "local_order_id": 42,
  "amarboost_order_id": 987654321,
  "status": "processing",
  "pricing": {
    "base_rate": 5.0,
    "amarboost_price": 500.0,
    "user_price": 500.0,
    "amarboost_cost": 384.62,
    "profit": 115.38,
    "markup_percent": 30
  },
  "message": "Order placed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Insufficient balance",
  "code": "INSUFFICIENT_BALANCE"
}
```

---

### Get User Balance
**Endpoint:** `GET /php/api-proxy.php?action=get_balance&user_id=user123`

**cURL Example:**
```bash
curl http://localhost/php/api-proxy.php \
  -G --data-urlencode "action=get_balance" \
  --data-urlencode "user_id=user123"
```

**Response:**
```json
{
  "success": true,
  "balance": 1500.50
}
```

---

### Cancel Order
**Endpoint:** `POST /php/api-proxy.php`

**Parameters:**
```
action=cancel_order
order_id=42
```

**cURL Example:**
```bash
curl -X POST http://localhost/php/api-proxy.php \
  -d "action=cancel_order" \
  -d "order_id=42"
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled and refunded",
  "refund_amount": 500.0
}
```

---

### Get Order History
**Endpoint:** `GET /php/api-proxy.php?action=get_user_orders&user_id=user123&limit=50`

**cURL Example:**
```bash
curl http://localhost/php/api-proxy.php \
  -G --data-urlencode "action=get_user_orders" \
  --data-urlencode "user_id=user123" \
  --data-urlencode "limit=50"
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 42,
      "service_name": "Instagram Followers",
      "quantity": 100,
      "user_price": 500.0,
      "profit": 115.38,
      "status": "completed",
      "amarboost_order_id": 987654321,
      "created_at": "2026-06-03 12:34:56"
    }
  ]
}
```

---

## 🔧 JavaScript API

### Place Order (Frontend)
```javascript
const result = await ORDER_API.placeOrder({
    user_id: 'user123',
    service_id: 1001,
    link: 'https://instagram.com/post/12345',
    quantity: 100,
    custom_data: 'Optional custom comments'
});

console.log(result);
// {
//   success: true,
//   local_order_id: 42,
//   amarboost_order_id: 987654321,
//   status: 'processing',
//   pricing: {...}
// }
```

### Get Order History
```javascript
const orders = await ORDER_API.getOrderHistory('user123', 50);
console.log(orders);
// Returns array of user's orders
```

### Get User Balance
```javascript
const balance = await ORDER_API.getUserBalance('user123');
console.log(`Current balance: $${balance}`);
```

### Add Balance (Simulate Payment)
```javascript
const result = await ORDER_API.addBalance('user123', 100, 'stripe');
if (result.success) {
    console.log('Balance added successfully');
}
```

### Calculate Price
```javascript
const pricing = ORDER_API.calculatePrice(5.0, 100, 30);
console.log(pricing);
// {
//   baseRate: 5,
//   amarboostPrice: 500,
//   userPrice: 500,
//   amarboostCost: 384.62,
//   profit: 115.38,
//   markupPercent: 30
// }
```

---

## 📊 SQL Queries for Management

### Get Today's Orders
```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(user_price) as total_revenue,
  SUM(profit) as total_profit
FROM orders 
WHERE DATE(created_at) = CURDATE();
```

### Get Pending Orders (Not Yet Completed)
```sql
SELECT * FROM orders 
WHERE status IN ('pending', 'processing')
AND sync_status = 'pending'
ORDER BY created_at DESC;
```

### Get User's Complete History
```sql
SELECT 
  id,
  service_name,
  quantity,
  user_price,
  profit,
  status,
  created_at
FROM orders 
WHERE user_id = 'user123'
ORDER BY created_at DESC;
```

### Get Profit By Service
```sql
SELECT 
  service_name,
  COUNT(*) as orders,
  SUM(profit) as total_profit,
  AVG(profit) as avg_profit
FROM orders 
WHERE status = 'completed'
GROUP BY service_name
ORDER BY total_profit DESC;
```

### Get Failed Orders (Needing Manual Review)
```sql
SELECT * FROM orders 
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Get Sync Issues
```sql
SELECT 
  o.id,
  o.amarboost_order_id,
  l.action,
  l.error_message,
  l.retry_count
FROM order_sync_log l
JOIN orders o ON l.order_id = o.id
WHERE l.status = 'failed'
ORDER BY l.created_at DESC;
```

---

## 🧪 Complete Integration Test

### Test Scenario: New User Orders Service

```bash
#!/bin/bash

# 1. Check database
echo "1️⃣ Testing database..."
php public/php/database.php

# 2. Place test order
echo ""
echo "2️⃣ Placing test order..."
curl -X POST http://localhost/php/order-handler.php \
  -d "action=place_order" \
  -d "user_id=test_user_123" \
  -d "service_id=1001" \
  -d "link=https://instagram.com/p/test" \
  -d "quantity=100"

# 3. Get balance
echo ""
echo "3️⃣ Checking user balance..."
curl http://localhost/php/api-proxy.php \
  -G --data-urlencode "action=get_balance" \
  --data-urlencode "user_id=test_user_123"

# 4. Get order history
echo ""
echo "4️⃣ Checking order history..."
curl http://localhost/php/api-proxy.php \
  -G --data-urlencode "action=get_user_orders" \
  --data-urlencode "user_id=test_user_123"

# 5. Trigger sync
echo ""
echo "5️⃣ Triggering order sync..."
php public/php/sync-engine.php sync

echo ""
echo "✅ Integration test complete!"
```

Save as `test-integration.sh` and run:
```bash
bash test-integration.sh
```

---

## 🚀 Deployment Steps

### 1. On Your Server
```bash
# SSH to server
ssh user@your-server.com

# Go to project
cd /home/user/boostbangla

# Run setup
bash setup-middleman.sh

# Edit config
nano public/php/.env
# Add your database credentials

# Initialize DB
php public/php/database.php
```

### 2. Set Up Cron Jobs
```bash
# Edit crontab
crontab -e

# Add these lines:
*/5 * * * * /usr/bin/php /home/user/boostbangla/public/php/sync-engine.php sync >> /tmp/boostbangla-sync.log 2>&1
0 1 * * * /usr/bin/php /home/user/boostbangla/public/php/sync-engine.php summary >> /tmp/boostbangla-summary.log 2>&1

# Save and exit (Ctrl+X, then Y, then Enter)
```

### 3. Test on Production
```bash
# Open order form
https://your-domain.com/pages/dashboard/middleman-order.html

# Try placing a test order
# Verify in database:
mysql boostbangla -e "SELECT * FROM orders ORDER BY id DESC LIMIT 1;"
```

---

## 📈 Monitoring Commands

### Check Real-Time Logs
```bash
tail -f public/php/logs/api_proxy_*.log
```

### Check Sync Status
```bash
mysql boostbangla -e "SELECT * FROM order_sync_log ORDER BY created_at DESC LIMIT 20;"
```

### Check Today's Profit
```bash
mysql boostbangla -e "SELECT SUM(profit) as daily_profit FROM orders WHERE DATE(created_at) = CURDATE();"
```

### Monitor Pending Orders
```bash
mysql boostbangla -e "SELECT id, amarboost_order_id, status, created_at FROM orders WHERE sync_status = 'pending';"
```

---

## 🆘 Quick Troubleshooting

### Problem: "Order placed but not syncing"
```bash
# Check cron is running
ps aux | grep sync-engine

# Manually run sync
php public/php/sync-engine.php sync

# Check logs
tail -50 public/php/logs/api_proxy_*.log
```

### Problem: "Database connection error"
```bash
# Check MySQL is running
sudo service mysql status

# Check credentials
cat public/php/.env | grep DB_

# Test connection
mysql -h localhost -u root -p boostbangla -e "SELECT 1;"
```

### Problem: "Balance not deducting"
```bash
# Check transaction log
mysql boostbangla -e "SELECT * FROM order_transactions ORDER BY created_at DESC LIMIT 10;"

# Check wallet
mysql boostbangla -e "SELECT * FROM user_wallets WHERE user_id = 'your_user_id';"
```

---

## 📞 Getting Help

1. **Check logs first:** `tail -f public/php/logs/*.log`
2. **Test API:** Use curl examples above
3. **Run tests:** `bash test-integration.sh`
4. **Review docs:** See `MIDDLEMAN_SETUP.md`
5. **Check code:** Review `order-handler.php` for logic

---

**Version:** 3.0  
**Last Updated:** 2026-06-03
