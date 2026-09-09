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
      INSERT INTO promotions (promocode, description, discountpercentage, maxdiscountamount, minordervalue, usagelimit, usedcount, startdate, enddate)
      VALUES 
      ('GIAM10K', 'Giảm 10K cho đơn từ 50K', 10, 10000, 50000, 100, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '30 days'),
      ('GIAM20K', 'Giảm 20K cho đơn từ 100K', 20, 20000, 100000, 100, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '30 days'),
      ('FREESHIP', 'Freeship cho đơn từ 150K', 100, 15000, 150000, 100, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '30 days')
      RETURNING *;
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
