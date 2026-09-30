const pool = require('./config/db');

async function createCustomerNotifications() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        image_url VARCHAR(500) NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Customer notifications table created');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

createCustomerNotifications();
