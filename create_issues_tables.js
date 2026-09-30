const pool = require('./config/db');

async function createTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_issues (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id BIGINT UNSIGNED NOT NULL,
                customer_id INT NOT NULL,
                vendor_id INT NOT NULL,
                issue_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES coupon_orders(id) ON DELETE CASCADE
            )
        `);
        console.log('order_issues table created.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
            )
        `);
        console.log('vendor_notifications table created.');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createTables();
