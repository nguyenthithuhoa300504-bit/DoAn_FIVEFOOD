const { Pool } = require('pg');
require('dotenv').config();

const config = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: { rejectUnauthorized: false }
};

const pool = new Pool(config);

pool.query("SELECT ProductID, ProductName FROM Products WHERE ProductName ILIKE '%mì%'", (err, res) => {
    if (err) {
        console.error(err);
    } else {
        console.log(res.rows);
    }
    pool.end();
});
