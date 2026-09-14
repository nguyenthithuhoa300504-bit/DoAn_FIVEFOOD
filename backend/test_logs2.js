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

pool.query("SELECT UserID, ConversationData, CreatedAt FROM ChatbotLogs ORDER BY CreatedAt DESC LIMIT 5", (err, res) => {
    if (err) {
        console.error(err);
    } else {
        res.rows.forEach(r => console.log('UserID:', r.userid, '=>', r.conversationdata));
    }
    pool.end();
});
