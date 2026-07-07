const { VNPay } = require('vnpay');

const vnpayInstance = new VNPay({
  tmnCode: '76WDTVCT',
  secureSecret: '0EBB7TGEGYP8D0BQUOTOTKMCR1YPLR0R',
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true,
  enableLog: true,
});

const url = vnpayInstance.buildPaymentUrl({
  vnp_Amount: 10000,
  vnp_IpAddr: '127.0.0.1',
  vnp_ReturnUrl: 'http://localhost:5173/',
  vnp_TxnRef: 'test_' + Date.now(),
  vnp_OrderInfo: 'Thanh toan test',
  vnp_OrderType: 'other',
  vnp_CreateDate: 20260707125500
});

console.log(url);
