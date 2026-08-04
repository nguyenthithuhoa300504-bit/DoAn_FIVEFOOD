const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT TOP 3 ConversationData FROM ChatbotLogs ORDER BY CreatedAt DESC');
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
run();
