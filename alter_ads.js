const pool = require('./config/db');

async function alterAds() {
  try {
    // Disable strict mode for this session
    await pool.query(`SET SESSION sql_mode = ''`);
    
    // Fix existing invalid dates
    await pool.query(`UPDATE ads SET start_date = NULL WHERE CAST(start_date AS CHAR) LIKE '%0000%'`);
    await pool.query(`UPDATE ads SET end_date = NULL WHERE CAST(end_date AS CHAR) LIKE '%0000%'`);
    await pool.query(`UPDATE ads SET reviewed_at = NULL WHERE CAST(reviewed_at AS CHAR) LIKE '%0000%'`);

    await pool.query(`ALTER TABLE ads ADD COLUMN campaign_type ENUM('featured', 'notification') DEFAULT 'featured'`);
    await pool.query(`ALTER TABLE ads ADD COLUMN price DECIMAL(10,2) NULL`);
    await pool.query(`ALTER TABLE ads ADD COLUMN discount DECIMAL(10,2) NULL`);
    console.log('Altered ads table successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist');
    } else {
      console.error(err);
    }
  } finally {
    pool.end();
  }
}

alterAds();
