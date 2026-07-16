const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 4 }, 'fivefood_jwt_secret_key_2026_secure', { expiresIn: '1h' });
fetch('http://localhost:3000/api/recommendations', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
}).then(res => res.json()).then(console.log).catch(console.error);
