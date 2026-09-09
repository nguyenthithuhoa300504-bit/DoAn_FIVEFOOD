const sql = require('mssql');
require('dotenv').config();
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '123456',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'DoAn',
    options: { encrypt: false, trustServerCertificate: true }
};
sql.connect(config).then(pool => {
    return pool.request().query('SELECT TOP 10 OrderID, Latitude, Longitude, Status FROM Orders ORDER BY OrderID DESC');
}).then(result => {
    console.log(result.recordset);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
