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
      SELECT o.OrderID, o.OrderDate, o.TotalAmount, o.DiscountAmount, o.ShippingFee, o.FinalAmount, 
              o.Status, o.PaymentMethod, o.PaymentStatus, o.ShippingAddress, o.CallCount
       FROM Orders o
       ORDER BY o.OrderDate DESC
       LIMIT 1;
    `);
    console.log('Query successful:', res.rows);
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    pool.end();
  }
}

run();
