const http = require('http');

const data = JSON.stringify({
  message: 'tóm tắt lại giỏ hàng',
  sessionId: 'test_session',
  localCart: []
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chatbot',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
