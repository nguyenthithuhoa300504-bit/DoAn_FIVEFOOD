const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123456',
  server: 'localhost',
  database: process.env.DB_NAME || 'DOAN_H',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  connectionTimeout: 5000,
  requestTimeout: 5000,
};

async function testConnection() {
  try {
    console.log('Connecting to:', config.server, config.port);
    let pool = await sql.connect(config);
    console.log('Connected successfully!');
    pool.close();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testConnection();
