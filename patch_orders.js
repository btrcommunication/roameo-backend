const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const [orders] = await pool.query('SELECT id, items FROM coupon_orders');
  
  for (const order of orders) {
    let items = order.items;
    if (typeof items === 'string') items = JSON.parse(items);
    
    let changed = false;
    items = items.map(item => {
      if (!item.redemption_codes || item.redemption_codes.length === 0) {
        changed = true;
        item.redemption_codes = Array.from({length: item.quantity || 1}, (_, i) => `RMO-FIX-${order.id}-${item.coupon_id}-${i+1}`);
      }
      return item;
    });
    
    if (changed) {
      await pool.query('UPDATE coupon_orders SET items = ? WHERE id = ?', [JSON.stringify(items), order.id]);
      console.log('Updated order', order.id);
    }
  }
  process.exit(0);
})();
