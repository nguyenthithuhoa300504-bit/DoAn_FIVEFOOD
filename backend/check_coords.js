const sql = require('mssql');
require('dotenv').config();
(async () => {
  try {
    await sql.connect(process.env.DATABASE_URL);
    const result = await sql.query(`SELECT OrderID, Latitude, Longitude FROM Orders ORDER BY OrderID DESC`);
    console.log(result.recordset);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
