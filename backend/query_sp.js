const sql = require('mssql');
require('dotenv').config();
(async () => {
  try {
    await sql.connect(process.env.DATABASE_URL);
    const result = await sql.query(`EXEC sp_helptext 'sp_TaoHoaDon'`);
    console.log(result.recordset.map(x => x.Text).join(''));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
