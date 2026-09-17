const { Pool } = require('pg');
(async () => {
  const pool = new Pool({
    host: 'db.neafmnsramxwudgqdnyr.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'wwS4W!+22-Aap/M',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  try {
    const result = await pool.query('SELECT OrderID, Latitude, Longitude, ShippingAddress FROM orders ORDER BY OrderID DESC LIMIT 5');
    console.log(result.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
