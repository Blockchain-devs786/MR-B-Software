import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'AzanMalik7860',
  database: process.env.DB_NAME || 'fast_food_oms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Helper to check if column exists


export async function initDatabase() {
  try {
    // Create DB if not exists
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'AzanMalik7860',
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'fast_food_oms'}\``);
    await tempConnection.end();

    const connection = await pool.getConnection();

    // Create Tables
    const schema = `
      CREATE TABLE IF NOT EXISTS tables_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_number VARCHAR(20) NOT NULL,
        capacity INT DEFAULT 4,
        status ENUM('Available', 'Occupied') DEFAULT 'Available'
      );

      CREATE TABLE IF NOT EXISTS waiters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS registries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NULL,
        opening_cash DECIMAL(10, 2) DEFAULT 0.00,
        closing_cash DECIMAL(10, 2) DEFAULT 0.00,
        closing_cash_after_expense DECIMAL(10, 2) DEFAULT 0.00,
        status ENUM('Open', 'Closed') DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20),
        delivery_address TEXT,
        table_number VARCHAR(50),
        table_id INT,
        waiter_id INT,
        rider_id INT,
        type ENUM('Dine-in', 'Takeaway', 'Delivery') DEFAULT 'Dine-in',
        status ENUM('Pending', 'Preparing', 'Ready', 'Completed', 'Refunded', 'Cancelled') DEFAULT 'Pending',
        payment_status ENUM('Pending', 'Paid') DEFAULT 'Pending',
        payment_method VARCHAR(255) DEFAULT 'Cash',
        payment_type ENUM('Cash', 'Credit', 'Bank Transfer', 'Card', 'Other') DEFAULT 'Cash',
        registry_id INT,
        subtotal DECIMAL(10, 2) DEFAULT 0.00,
        discount DECIMAL(10, 2) DEFAULT 0.00,
        service_charges DECIMAL(10, 2) DEFAULT 0.00,
        gst DECIMAL(10, 2) DEFAULT 0.00,
        delivery_charges DECIMAL(10, 2) DEFAULT 0.00,
        total DECIMAL(10, 2) DEFAULT 0.00,
        cancel_reason TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (registry_id) REFERENCES registries(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        item_id INT,
        item_name VARCHAR(255),
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10, 2) DEFAULT 0.00,
        price DECIMAL(10, 2) DEFAULT 0.00,
        discount DECIMAL(10, 2) DEFAULT 0.00,
        line_total DECIMAL(10, 2) DEFAULT 0.00,
        note TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        category_id INT,
        is_available BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS riders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        status ENUM('Available', 'Busy', 'Offline') DEFAULT 'Available'
      );

      CREATE TABLE IF NOT EXISTS expense_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100),
        registry_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registry_id) REFERENCES registries(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS refunds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payment_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_method_id INT NOT NULL,
        account_number VARCHAR(255) NOT NULL,
        account_label VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key_name VARCHAR(255) PRIMARY KEY,
        value LONGTEXT
      );

      CREATE TABLE IF NOT EXISTS order_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        payment_type VARCHAR(50) NOT NULL,
        account_id INT,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY(account_id) REFERENCES payment_accounts(id) ON DELETE SET NULL
      );
    `;

    await connection.query(schema);

    // Migration: add note column to order_items if missing (for existing DBs)
    try {
      const [cols]: any = await connection.query(
        "SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'note'"
      );
      if (cols && cols[0] && cols[0].c === 0) {
        await connection.query('ALTER TABLE order_items ADD COLUMN note TEXT');
        console.log('Added note column to order_items');
      }
    } catch (e) {
      // Ignore if column already exists or table missing
    }

    // Migration: add delivery_charges column to orders if missing (for existing DBs)
    try {
      const [cols]: any = await connection.query(
        "SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'delivery_charges'"
      );
      if (cols && cols[0] && cols[0].c === 0) {
        await connection.query('ALTER TABLE orders ADD COLUMN delivery_charges DECIMAL(10, 2) DEFAULT 0.00 AFTER gst');
        console.log('Added delivery_charges column to orders');
      }
    } catch (e) {
      // Ignore if column already exists or table missing
    }

    // Migration: change settings value column to LONGTEXT for base64 images
    try {
      await connection.query('ALTER TABLE settings MODIFY COLUMN value LONGTEXT');
      console.log('Migrated settings value column to LONGTEXT');
    } catch (e) {
      console.error('Failed to migrate settings value column', e);
    }

    // Migration: fix order_items with missing item_name by looking up from items table
    try {
      const [result]: any = await connection.query(
        `UPDATE order_items oi
         INNER JOIN items i ON oi.item_id = i.id
         SET oi.item_name = i.name
         WHERE oi.item_name IS NULL OR oi.item_name = ''`
      );
      if (result && result.affectedRows > 0) {
        console.log(`Fixed ${result.affectedRows} order_items with missing item_name`);
      }
    } catch (e) {
      // Ignore errors
    }

    // Seed default waiters if table is empty
    const [waiters]: any = await connection.query('SELECT COUNT(*) as count FROM waiters');
    if (waiters[0].count === 0) {
      await connection.query("INSERT INTO waiters (name) VALUES ('Waiter 1'), ('Waiter 2'), ('Waiter 3')");
    }

    // Seed default tables if table is empty
    const [tables]: any = await connection.query('SELECT COUNT(*) as count FROM tables_info');
    if (tables[0].count === 0) {
      await connection.query("INSERT INTO tables_info (table_number, capacity) VALUES ('T1', 4), ('T2', 4), ('T3', 6), ('T4', 2), ('T5', 8)");
    }

    // Seed default categories if table is empty
    const [categories]: any = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (categories[0].count === 0) {
      await connection.query("INSERT INTO categories (name) VALUES ('Meals'), ('Drinks'), ('Desserts'), ('Sides')");
    }

    // Seed default expense categories if table is empty
    const [expenseCategories]: any = await connection.query('SELECT COUNT(*) as count FROM expense_categories');
    if (expenseCategories[0].count === 0) {
      await connection.query("INSERT INTO expense_categories (name) VALUES ('General'), ('Inventory'), ('Salaries'), ('Utilities'), ('Maintenance')");
    }

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

export async function query(sql: string, params?: any[]) {
  const [results] = await pool.execute(sql, params);
  return results;
}

export default pool;
