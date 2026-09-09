const { Client } = require('pg');
const client = new Client({
  host: 'db.neafmnsramxwudgqdnyr.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'wwS4W!+22-Aap/M',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query('SELECT ConversationData, CreatedAt FROM ChatbotLogs ORDER BY CreatedAt DESC LIMIT 10'))
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
  })
  .catch(console.error);
