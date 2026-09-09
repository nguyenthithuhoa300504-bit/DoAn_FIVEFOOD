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
    const res = await pool.query('ALTER TABLE orders ADD COLUMN callcount integer DEFAULT 0');
    console.log('Successfully added callcount to orders table.');
  } catch (err) {
    console.error('Error adding column:', err.message);
  } finally {
    pool.end();
  }
}

run();
