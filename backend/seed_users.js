const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: 'db.neafmnsramxwudgqdnyr.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'wwS4W!+22-Aap/M',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  // Create roles
  await client.query(`INSERT INTO roles (RoleName) VALUES ('Admin'), ('Client') ON CONFLICT (RoleName) DO NOTHING`);
  
  const resRoles = await client.query('SELECT * FROM roles');
  let adminRoleId = resRoles.rows.find(r => r.rolename === 'Admin').roleid;
  let clientRoleId = resRoles.rows.find(r => r.rolename === 'Client').roleid;

  // Hash password '123456'
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('123456', salt);

  // Insert admin
  await client.query(`
    INSERT INTO users (FullName, Email, Phone, PasswordHash, RoleID) 
    VALUES ('Admin Manager', 'admin@fivefood.com', '0901234567', $1, $2)
    ON CONFLICT (Email) DO NOTHING
  `, [hash, adminRoleId]);

  // Insert client
  await client.query(`
    INSERT INTO users (FullName, Email, Phone, PasswordHash, RoleID) 
    VALUES ('Khách hàng', 'client@fivefood.com', '0987654321', $1, $2)
    ON CONFLICT (Email) DO NOTHING
  `, [hash, clientRoleId]);

  console.log('Roles and Users seeded successfully!');
  await client.end();
}

run();
