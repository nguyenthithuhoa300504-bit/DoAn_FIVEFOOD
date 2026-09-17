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
    const lat = 11.6507180;
    const lng = 106.6136083;
    await pool.query(`UPDATE orders SET Latitude = $1, Longitude = $2 WHERE OrderID = 15`, [lat, lng]);
    console.log('Order 15 updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
