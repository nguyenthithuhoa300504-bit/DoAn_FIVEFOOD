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
    const result = await pool.query(`SELECT pg_get_functiondef('sp_TaoHoaDon'::regproc);`);
    console.log(result.rows[0].pg_get_functiondef);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
