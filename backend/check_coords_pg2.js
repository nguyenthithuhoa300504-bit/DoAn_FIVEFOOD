const { Pool } = require('pg');
require('dotenv').config({ path: 'c:\\Users\\Admin\\Desktop\\DoAn\\backend\\.env' });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY OrderID DESC LIMIT 1');
    console.log(result.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
