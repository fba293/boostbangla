# BoostBangla Middleman Order System - Setup Guide

## 📋 Prerequisites

- PHP 7.4+ with MySQLi extension
- MySQL 5.7+ or MariaDB 10.2+
- cURL extension enabled
- Apache/Nginx with mod_rewrite enabled

## 🚀 Installation Steps

### Step 1: Database Setup

#### Option A: Using Command Line

```bash
# SSH into your server
ssh user@your-server.com

# Navigate to project
cd /path/to/boostbangla/public/php

# Run database initialization
php database.php
```

#### Option B: Using phpMyAdmin

1. Open phpMyAdmin
2. Create new database: `boostbangla_orders`
3. Run the SQL from `database.php` manually (all CREATE TABLE queries)

#### Option C: Using MySQL CLI

```bash
mysql -u root -p boostbangla < database-schema.sql
```

### Step 2: Environment Configuration

Create `.env` file in `/public/php/`:

```bash
# MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=boostbangla_orders

# AmarBoost API
AMARBOOST_KEY=b16011ef550d30af27e306d128747cee
AMARBOOST_API=https://amarboost.com/api/v2

# Application Settings
SITE_URL=https://yourdomain.com
ENVIRONMENT=production
DEBUG=false
```

### Step 3: Update config.php

Edit `/public/php/config.php`:

```php
<?php
// Load environment variables
$dotenv = parse_ini_file(__DIR__ . '/.env');

// Database Configuration
define('DB_HOST', $dotenv['DB_HOST'] ?? 'localhost');
define('DB_USER', $dotenv['DB_USER'] ?? 'root');
define('DB_PASS', $dotenv['DB_PASS'] ?? '');
define('DB_NAME', $dotenv['DB_NAME'] ?? 'boostbangla');

// ... rest of config
?>
```

### Step 4: Create Log Directory

```bash
mkdir -p /path/to/boostbangla/public/php/logs
chmod 755 /path/to/boostbangla/public/php/logs
```

### Step 5: Set Cron Jobs

#### For Order Sync (Every 5 minutes)

```bash
*/5 * * * * /usr/bin/php /path/to/boostbangla/public/php/sync-engine.php sync >> /var/log/boostbangla-sync.log 2>&1
```

#### For Daily Profit Summary (Every day at 1 AM)

```bash
0 1 * * * /usr/bin/php /path/to/boostbangla/public/php/sync-engine.php summary >> /var/log/boostbangla-summary.log 2>&1
```

### Step 6: Update Frontend Files

Add this to your HTML order pages (before </body>):

```html
<!-- Order API -->
<script src="/assets/js/api/order-api.js"></script>

<!-- Include in your order module -->
<script>
// When user submits order form, use:
ORDER_API.placeOrder({
    user_id: currentUser.uid,
    service_id: selectedService.service,
    link: formData.link,
    quantity: formData.quantity,
    custom_data: formData.customData || null
});
</script>
```

## ✅ Verification Checklist

```bash
# 1. Check database tables created
mysql -u root -p boostbangla -e "SHOW TABLES;"

# 2. Test database connection
php -r "require 'database.php'; Database::getInstance(); echo 'DB Connected!';"

# 3. Test order handler
curl -X POST http://localhost/php/order-handler.php \
  -d "action=place_order&user_id=test&service_id=1&link=https://example.com&quantity=10"

# 4. Check logs
tail -f /path/to/boostbangla/public/php/logs/api_proxy_*.log
```

## 🔄 How It Works

### User Places Order
1. User fills order form on website
2. Frontend calls `ORDER_API.placeOrder()`
3. Request sent to `/php/order-handler.php`

### Order Processing
1. **Validate** order data and user balance
2. **Store** order locally with `status: pending`
3. **Deduct** balance from user wallet
4. **Forward** order to AmarBoost API
5. **Link** AmarBoost order ID to local order
6. **Return** confirmation with order IDs

### Background Sync
1. Cron job runs every 5 minutes
2. Fetches all pending orders from database
3. Gets status from AmarBoost for each order
4. Updates local order status
5. Logs all transactions
6. Generates profit summary

### Pricing Logic
```
User Price = AmarBoost Base Rate × Quantity
Your Cost = User Price ÷ 1.30 (30% less)
Your Profit = User Price - Your Cost = 30% margin
```

### Example
```
AmarBoost service rate: $5
User orders 100 units: $5 × 100 = $500
You charge user: $500 (hidden markup)
You pay AmarBoost: $500 ÷ 1.30 = $384.62
Your profit: $500 - $384.62 = $115.38 (30%)
```

## 🛠 Troubleshooting

### Database Connection Error
```
Check:
- MySQL is running: sudo service mysql status
- Credentials in .env file
- Database user has proper permissions
```

### Orders Not Syncing
```
Check:
- Cron job is running: ps aux | grep "sync-engine.php"
- Check logs: tail -f /path/to/logs/api_proxy_*.log
- Verify AmarBoost API key in config.php
```

### High Processing Fees
```
Solution:
- Check PROFIT_MARGIN in config.php (default 1.30 = 30%)
- Verify pricing calculations in calculatePricing()
- Review profit_summary table for daily stats
```

## 📊 Monitoring Dashboard Queries

```sql
-- Today's Orders
SELECT COUNT(*) as orders, SUM(profit) as daily_profit 
FROM orders WHERE DATE(created_at) = CURDATE();

-- User Balance
SELECT user_id, balance, lifetime_spent 
FROM user_wallets ORDER BY balance DESC LIMIT 10;

-- Pending Orders (Not Synced)
SELECT id, amarboost_order_id, status, created_at 
FROM orders WHERE sync_status = 'pending' 
ORDER BY created_at ASC;

-- Failed Syncs (For Retry)
SELECT * FROM order_sync_log 
WHERE status = 'failed' AND retry_count < 3 
ORDER BY created_at ASC;

-- Profit Summary
SELECT * FROM profit_summary 
ORDER BY date DESC LIMIT 30;
```

## 🔐 Security Notes

1. **API Keys**: Store in `.env`, never in code
2. **HTTPS**: Always use HTTPS for API calls
3. **Rate Limiting**: Already implemented in api-proxy.php
4. **Transactions**: Use database transactions for atomic operations
5. **Logging**: All API calls logged for audit trail
6. **Balance Verification**: Always verify user balance before charging

## 🚀 Next Steps

1. ✅ Initialize database
2. ✅ Configure environment variables
3. ✅ Set up cron jobs
4. ✅ Test order placement
5. ✅ Monitor sync logs
6. ✅ Generate daily reports

## 📞 Support

For issues or questions:
1. Check logs in `/php/logs/`
2. Verify AmarBoost API connectivity
3. Test individual components with curl
4. Review SQL queries in sync-engine.php

---

**Version**: 3.0  
**Last Updated**: 2026-06-03  
**Maintained By**: BoostBangla Team
