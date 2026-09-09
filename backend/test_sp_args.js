require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT pg_get_functiondef(oid)
      FROM pg_proc
      WHERE proname = 'sp_taohoadon';
    `);
    console.log(res.rows[0].pg_get_functiondef);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
