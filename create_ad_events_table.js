const pool = require('./config/db');

async function createAdEventsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ad_id INT NOT NULL,
        event_type ENUM('impression', 'click') NOT NULL,
        user_id INT DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ad_events_ad_id (ad_id),
        INDEX idx_ad_events_type (event_type),
        INDEX idx_ad_events_created_at (created_at),
        INDEX idx_ad_events_composite (ad_id, event_type, created_at)
      ) DEFAULT CHARSET=utf8mb4;
    `);
    console.log('ad_events table created or already exists.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating ad_events table:', err);
    process.exit(1);
  }
}

createAdEventsTable();
