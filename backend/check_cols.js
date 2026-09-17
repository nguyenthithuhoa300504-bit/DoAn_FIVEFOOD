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
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders';
    `);
    console.log(result.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
