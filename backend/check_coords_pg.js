const { Pool } = require('pg');
require('dotenv').config();
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query('SELECT OrderID, Latitude, Longitude FROM orders ORDER BY OrderID DESC LIMIT 5');
    console.log(result.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
