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
    
    // Fetch all orders
    const [orders] = await pool.query('SELECT id, items FROM coupon_orders');
    
    let updateCount = 0;
    for (const order of orders) {
      let items = order.items;
      if (typeof items === 'string') items = JSON.parse(items);
      
      let changed = false;
      
      for (const item of items) {
        // Get the real coupon code from the coupons table
        const [coupons] = await pool.query('SELECT coupon_code FROM coupons WHERE id = ?', [item.coupon_id]);
        if (coupons.length > 0 && coupons[0].coupon_code) {
          item.redemption_codes = [coupons[0].coupon_code];
          changed = true;
        }
      }
      
      if (changed) {
        await pool.query('UPDATE coupon_orders SET items = ? WHERE id = ?', [JSON.stringify(items), order.id]);
        updateCount++;
      }
    }
    
    console.log(`Successfully synced ${updateCount} orders with new coupon codes.`);
    process.exit(0);
  } catch (error) {
    console.error('Error syncing orders:', error);
    process.exit(1);
  }
})();
