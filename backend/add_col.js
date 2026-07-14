const sql = require('mssql');
async function run() {
  const config = {
    user: 'sa',
    password: '123456',
    server: 'localhost',
    database: 'DOAN_H',
    options: { encrypt: false, trustServerCertificate: true }
  };
  try {
    let pool = await sql.connect(config);
    await pool.request().query('ALTER TABLE Orders ADD CallCount INT DEFAULT 0');
    console.log('Added CallCount column');
  } catch(e) {
    if (e.message.includes('already exists')) {
      console.log('Column already exists');
    } else {
      console.error(e);
    }
  } finally {
    process.exit();
  }
}
run();
