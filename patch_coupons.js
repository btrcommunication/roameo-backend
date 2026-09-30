const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // Fetch all coupons
    const [coupons] = await pool.query('SELECT id FROM coupons');
    
    let updateCount = 0;
    for (const coupon of coupons) {
      const randomStr = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = `ROA-${coupon.id}-${randomStr}`;
      
      await pool.query('UPDATE coupons SET coupon_code = ? WHERE id = ?', [generatedCode, coupon.id]);
      updateCount++;
    }
    
    console.log(`Successfully updated ${updateCount} coupons with new coupon codes.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating coupons:', error);
    process.exit(1);
  }
})();
