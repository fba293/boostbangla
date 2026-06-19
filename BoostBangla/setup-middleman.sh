#!/bin/bash

# ============================================
# BoostBangla Middleman System - Quick Setup Script
# ============================================

set -e

echo "🚀 BoostBangla Middleman System Setup"
echo "======================================"

PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PHP_PATH="$PROJECT_PATH/public/php"

echo "📁 Project path: $PROJECT_PATH"
echo ""

# Step 1: Check PHP
echo "✓ Checking PHP installation..."
if ! command -v php &> /dev/null; then
    echo "❌ PHP not installed. Please install PHP 7.4+."
    exit 1
fi

PHP_VERSION=$(php -v | grep -oE "PHP [0-9]\.[0-9]" | awk '{print $2}')
echo "   ✅ PHP $PHP_VERSION found"

# Step 2: Check MySQL
echo ""
echo "✓ Checking MySQL installation..."
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL not installed. Please install MySQL 5.7+."
    exit 1
fi
echo "   ✅ MySQL found"

# Step 3: Create directories
echo ""
echo "✓ Creating required directories..."
mkdir -p "$PHP_PATH/logs"
mkdir -p "$PROJECT_PATH/public/cache"
chmod 755 "$PHP_PATH/logs"
chmod 755 "$PROJECT_PATH/public/cache"
echo "   ✅ Directories created"

# Step 4: Check .env file
echo ""
echo "✓ Checking environment configuration..."
if [ ! -f "$PHP_PATH/.env" ]; then
    echo "   ⚠️  .env file not found. Creating template..."
    cat > "$PHP_PATH/.env" << 'EOF'
# MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=boostbangla

# AmarBoost API
AMARBOOST_KEY=b16011ef550d30af27e306d128747cee

# Application Settings
SITE_URL=http://localhost
ENVIRONMENT=development
DEBUG=true
EOF
    echo "   ✅ Template created at $PHP_PATH/.env"
    echo "   ⚠️  Please edit .env with your database credentials!"
else
    echo "   ✅ .env file exists"
fi

# Step 5: Initialize database
echo ""
echo "✓ Testing database connection..."
if mysql -u root -e "SELECT 1" > /dev/null 2>&1; then
    echo "   ✅ MySQL connection successful"
    
    echo ""
    echo "✓ Initializing database schema..."
    php "$PHP_PATH/database.php" && echo "   ✅ Database initialized" || echo "   ⚠️  Database initialization skipped (check MySQL credentials in .env)"
else
    echo "   ⚠️  MySQL connection failed"
    echo "   Please check your MySQL connection and update .env file"
fi

# Step 6: Verify file permissions
echo ""
echo "✓ Checking file permissions..."
if [ -w "$PHP_PATH/logs" ]; then
    echo "   ✅ Log directory writable"
else
    echo "   ⚠️  Log directory not writable"
fi

if [ -w "$PROJECT_PATH/public/cache" ]; then
    echo "   ✅ Cache directory writable"
else
    echo "   ⚠️  Cache directory not writable"
fi

# Step 7: Setup cron jobs (optional)
echo ""
echo "✓ Cron job setup..."
echo "   To enable automatic order syncing, add these to your crontab:"
echo ""
echo "   */5 * * * * php $PHP_PATH/sync-engine.php sync >> /var/log/boostbangla-sync.log 2>&1"
echo "   0 1 * * * php $PHP_PATH/sync-engine.php summary >> /var/log/boostbangla-summary.log 2>&1"
echo ""

# Step 8: Test components
echo "✓ Testing core components..."
php -r "
    require '$PHP_PATH/database.php';
    try {
        \$db = Database::getInstance();
        echo '✅ Database class loaded successfully\n';
    } catch (Exception \$e) {
        echo '❌ Database error: ' . \$e->getMessage() . '\n';
    }
" || echo "   ⚠️  Component test skipped"

# Summary
echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env with your database credentials"
echo "2. Verify database was created: mysql -e 'SHOW DATABASES;' | grep boostbangla"
echo "3. Test order handler: curl http://localhost/php/order-handler.php"
echo "4. Set up cron jobs for automatic syncing"
echo "5. Open http://localhost/pages/dashboard/middleman-order.html to test ordering"
echo ""
echo "📚 Documentation: See MIDDLEMAN_SETUP.md"
echo "🚀 For production deployment, review security settings in config.php"
echo ""
