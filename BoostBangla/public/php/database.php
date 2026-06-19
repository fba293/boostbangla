<?php
// ============================================
// Database Connection & Schema Manager
// BoostBangla Middleman Order System
// ============================================

class Database {
    private static $instance = null;
    private $connection = null;
    private $config = [];
    private $schemaReady = false;
    
    private function __construct($config = []) {
        $this->config = array_merge([
            'host' => getenv('DB_HOST') ?: 'localhost',
            'user' => getenv('DB_USER') ?: 'root',
            'pass' => getenv('DB_PASS') ?: '',
            'name' => getenv('DB_NAME') ?: 'boostbangla'
        ], $config);
        
        $this->connect();
    }
    
    private function connect() {
        try {
            $this->connection = new mysqli(
                $this->config['host'],
                $this->config['user'],
                $this->config['pass'],
                $this->config['name']
            );
            
            if ($this->connection->connect_error) {
                throw new Exception("Connection failed: " . $this->connection->connect_error);
            }
            
            $this->connection->set_charset("utf8mb4");
            $this->initSchema();
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public static function getInstance($config = []) {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Initialize database schema
    public function initSchema() {
        if ($this->schemaReady) return true;
        $queries = [
            // Orders table - Main order tracking
            "CREATE TABLE IF NOT EXISTS `orders` (
                `id` INT PRIMARY KEY AUTO_INCREMENT,
                `user_id` VARCHAR(255) NOT NULL,
                `service_id` INT NOT NULL,
                `service_name` VARCHAR(255) NOT NULL,
                `link` TEXT NOT NULL,
                `quantity` INT NOT NULL,
                `base_rate` DECIMAL(10, 4) NOT NULL,
                `user_price` DECIMAL(10, 4) NOT NULL,
                `amarboost_price` DECIMAL(10, 4) NOT NULL,
                `profit` DECIMAL(10, 4) NOT NULL,
                `local_order_id` INT UNIQUE,
                `amarboost_order_id` INT,
                `status` ENUM('pending', 'processing', 'in_progress', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
                `local_status` VARCHAR(50) DEFAULT 'pending',
                `amarboost_status` VARCHAR(50),
                `sync_status` ENUM('synced', 'pending', 'failed') DEFAULT 'pending',
                `last_sync` TIMESTAMP NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user (user_id),
                INDEX idx_amarboost_order (amarboost_order_id),
                INDEX idx_status (status),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
            
            // Order transactions - Profit tracking
            "CREATE TABLE IF NOT EXISTS `order_transactions` (
                `id` INT PRIMARY KEY AUTO_INCREMENT,
                `order_id` INT NULL,
                `user_id` VARCHAR(255) NOT NULL,
                `transaction_type` ENUM('debit', 'credit', 'refund', 'fee') DEFAULT 'debit',
                `amount` DECIMAL(10, 4) NOT NULL,
                `balance_before` DECIMAL(10, 4) NOT NULL,
                `balance_after` DECIMAL(10, 4) NOT NULL,
                `description` TEXT,
                `reference_id` VARCHAR(255),
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                INDEX idx_user (user_id),
                INDEX idx_order (order_id),
                INDEX idx_type (transaction_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
            
            // Order sync log - AmarBoost integration history
            "CREATE TABLE IF NOT EXISTS `order_sync_log` (
                `id` INT PRIMARY KEY AUTO_INCREMENT,
                `order_id` INT NOT NULL,
                `amarboost_order_id` INT,
                `action` VARCHAR(50) NOT NULL,
                `request_data` JSON,
                `response_data` JSON,
                `status` ENUM('success', 'failed', 'pending') DEFAULT 'pending',
                `error_message` TEXT,
                `retry_count` INT DEFAULT 0,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                INDEX idx_order (order_id),
                INDEX idx_action (action),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
            
            // User wallets - Balance management
            "CREATE TABLE IF NOT EXISTS `user_wallets` (
                `id` INT PRIMARY KEY AUTO_INCREMENT,
                `user_id` VARCHAR(255) UNIQUE NOT NULL,
                `balance` DECIMAL(10, 4) DEFAULT 0,
                `total_spent` DECIMAL(10, 4) DEFAULT 0,
                `total_refunded` DECIMAL(10, 4) DEFAULT 0,
                `lifetime_spent` DECIMAL(10, 4) DEFAULT 0,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
            
            // Services cache - Local service cache with pricing
            "CREATE TABLE IF NOT EXISTS `services_cache` (
                `id` INT PRIMARY KEY AUTO_INCREMENT,
                `service_id` INT UNIQUE NOT NULL,
                `service_name` VARCHAR(255) NOT NULL,
                `category` VARCHAR(100),
                `base_rate` DECIMAL(10, 4) NOT NULL,
                `user_price` DECIMAL(10, 4) NOT NULL,
                `amarboost_price` DECIMAL(10, 4) NOT NULL,
                `markup_percent` INT DEFAULT 30,
                `min_order` INT DEFAULT 1,
                `max_order` INT DEFAULT 100000,
                `is_active` BOOLEAN DEFAULT TRUE,
                `cached_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service (service_id),
                INDEX idx_category (category),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
            
            // Admin profit summary - Daily/monthly profit tracking
            "CREATE TABLE IF NOT EXISTS `profit_summary` (
                `id` INT PRIMARY KEY AUTO_INCREMENT,
                `date` DATE NOT NULL UNIQUE,
                `total_orders` INT DEFAULT 0,
                `total_user_revenue` DECIMAL(10, 4) DEFAULT 0,
                `total_amarboost_cost` DECIMAL(10, 4) DEFAULT 0,
                `total_profit` DECIMAL(10, 4) DEFAULT 0,
                `average_markup_percent` DECIMAL(5, 2) DEFAULT 30,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
        ];
        
        foreach ($queries as $query) {
            if (!$this->connection->query($query)) {
                error_log("Schema creation error: " . $this->connection->error);
                throw new Exception("Failed to create schema: " . $this->connection->error);
            }
        }

        $this->runSafeMigration("ALTER TABLE `order_transactions` MODIFY `order_id` INT NULL");
        $this->runSafeMigration("ALTER TABLE `order_transactions` ADD COLUMN `reference_id` VARCHAR(255) NULL");
        $this->runSafeMigration("ALTER TABLE `orders` ADD COLUMN `firestore_order_id` VARCHAR(255) NULL");
        $this->runSafeMigration("ALTER TABLE `orders` ADD COLUMN `retry_count` INT DEFAULT 0");
        $this->runSafeMigration("ALTER TABLE `user_wallets` ADD COLUMN `pending_mysql_sync` TINYINT(1) DEFAULT 0");
        
        $this->schemaReady = true;
        return true;
    }

    private function runSafeMigration($sql) {
        try {
            $this->connection->query($sql);
        } catch (Throwable $e) {
            error_log("Schema migration skipped: " . $e->getMessage());
        }
    }
    
    // Execute prepared statement
    public function execute($sql, $types = '', $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $this->connection->error);
            }
            
            if ($types && $params) {
                $stmt->bind_param($types, ...$params);
            }
            
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }
            
            return $stmt;
        } catch (Exception $e) {
            error_log("Database execute error: " . $e->getMessage());
            throw $e;
        }
    }
    
    // Execute query and get single row
    public function getRow($sql, $types = '', $params = []) {
        $stmt = $this->execute($sql, $types, $params);
        $result = $stmt->get_result();
        $stmt->close();
        return $result->fetch_assoc();
    }
    
    // Execute query and get all rows
    public function getRows($sql, $types = '', $params = []) {
        $stmt = $this->execute($sql, $types, $params);
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        $stmt->close();
        return $rows;
    }
    
    // Insert and get last ID
    public function insert($sql, $types = '', $params = []) {
        $this->execute($sql, $types, $params);
        return $this->connection->insert_id;
    }
    
    // Update rows
    public function update($sql, $types = '', $params = []) {
        $stmt = $this->execute($sql, $types, $params);
        $affected = $stmt->affected_rows;
        $stmt->close();
        return $affected;
    }
    
    // Delete rows
    public function delete($sql, $types = '', $params = []) {
        return $this->update($sql, $types, $params);
    }
    
    // Start transaction
    public function beginTransaction() {
        return $this->connection->begin_transaction();
    }
    
    // Commit transaction
    public function commit() {
        return $this->connection->commit();
    }
    
    // Alias for getRow (query single)
    public function queryOne($sql, $params = []) {
        return $this->getRow($sql, $this->getTypesString(count($params)), $params);
    }
    
    // Alias for getRows (query multiple)
    public function query($sql, $params = []) {
        return $this->getRows($sql, $this->getTypesString(count($params)), $params);
    }
    
    // Helper to generate types string based on param count
    private function getTypesString($count) {
        // Assume all params are strings by default
        return str_repeat('s', $count);
    }
    
    // Helper method to insert with table and columns
    public function insertRow($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO `$table` ($columns) VALUES ($placeholders)";
        return $this->insert($sql, $this->getTypesString(count($data)), array_values($data));
    }
    
    // Helper method to update with table and conditions
    public function updateRow($table, $data, $where) {
        $setClause = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($data)));
        $whereClause = implode(' AND ', array_map(fn($k) => "`$k` = ?", array_keys($where)));
        $sql = "UPDATE `$table` SET $setClause WHERE $whereClause";
        $params = array_merge(array_values($data), array_values($where));
        return $this->update($sql, $this->getTypesString(count($params)), $params);
    }
    
    // Rollback transaction
    public function rollback() {
        return $this->connection->rollback();
    }
    
    // Close connection
    public function close() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
}

// Initialize database if accessed directly
if (php_sapi_name() === 'cli') {
    try {
        $db = Database::getInstance();
        $db->initSchema();
        echo "✅ Database schema initialized successfully!\n";
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}
?>
