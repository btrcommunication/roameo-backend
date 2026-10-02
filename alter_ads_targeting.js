const pool = require('./config/db');

async function alterAdsTargeting() {
  try {
    await pool.query(`SET SESSION sql_mode = ''`);

    const columnsToAdd = [
      { name: 'target_type', type: "ENUM('all', 'category', 'coupon') DEFAULT 'all'" },
      { name: 'category_ids', type: "TEXT NULL" },
      { name: 'coupon_ids', type: "TEXT NULL" },
      { name: 'category_id', type: "INT NULL" },
      { name: 'coupon_id', type: "INT NULL" },
      { name: 'discount_type', type: "ENUM('percentage', 'lumpsum') DEFAULT 'percentage'" }
    ];

    for (const col of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE ads ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${col.name} already exists`);
        } else {
          console.error(`Error adding ${col.name}:`, err.message);
        }
      }
    }

    console.log('Ads table targeting migration completed.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    pool.end();
  }
}

alterAdsTargeting();
