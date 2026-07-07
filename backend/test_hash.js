const crypto = require('crypto');

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

const secretKey = 'TTR32CK49S3YZL0CWEDGV8KZQEKAFRSD';

let vnp_Params = {};
vnp_Params['vnp_Version'] = '2.1.0';
vnp_Params['vnp_Command'] = 'pay';
vnp_Params['vnp_TmnCode'] = '76WDTVCT';
vnp_Params['vnp_Locale'] = 'vn';
vnp_Params['vnp_CurrCode'] = 'VND';
vnp_Params['vnp_TxnRef'] = '12345';
vnp_Params['vnp_OrderInfo'] = 'Thanh_toan_don_hang_123';
vnp_Params['vnp_OrderType'] = 'other';
vnp_Params['vnp_Amount'] = 100000 * 100;
vnp_Params['vnp_ReturnUrl'] = 'http://localhost:5173/';
vnp_Params['vnp_IpAddr'] = '127.0.0.1';
vnp_Params['vnp_CreateDate'] = '20260707130000';

vnp_Params = sortObject(vnp_Params);

let signData = '';
for (const key in vnp_Params) {
    if (vnp_Params.hasOwnProperty(key)) {
        signData += key + '=' + vnp_Params[key] + '&';
    }
}
if (signData.length > 0) {
    signData = signData.slice(0, -1);
}

console.log('signData:', signData);

const hmac = crypto.createHmac('sha512', secretKey);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex'); 

console.log('secureHash:', signed);
