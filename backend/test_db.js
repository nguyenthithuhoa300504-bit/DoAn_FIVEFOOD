const sql = require('mssql');
require('dotenv').config();
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    options: { encrypt: true, trustServerCertificate: false }
};
sql.connect(config).then(pool => {
    return pool.request().query("SELECT ProductID, ProductName FROM Products WHERE ProductName LIKE N'%mì%'");
}).then(result => {
    console.log(result.recordset);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
