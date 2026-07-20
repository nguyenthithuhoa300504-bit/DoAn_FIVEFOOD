const http = require('http');

const data = JSON.stringify({
  code: 'VOUCHER10',
  totalAmount: 150000
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/orders/validate-promo',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
