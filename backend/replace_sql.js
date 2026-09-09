const fs = require('fs');

function processFile(file, replaces) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    for (const { regex, replacement } of replaces) {
        content = content.replace(regex, replacement);
    }
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
    }
}

// 1. cart.service.ts
processFile('src/cart/cart.service.ts', [
    { regex: /GETDATE\(\)/g, replacement: 'CURRENT_TIMESTAMP' }
]);

// 3. payment.service.ts
processFile('src/payment/payment.service.ts', [
    { regex: /GETDATE\(\)/g, replacement: 'CURRENT_TIMESTAMP' },
    { regex: /N'Đã thanh toán'/g, replacement: "'Đã thanh toán'" },
    { regex: /N'Chưa thanh toán'/g, replacement: "'Chưa thanh toán'" }
]);

// 4. chat.service.ts
processFile('src/chat/chat.service.ts', [
    { regex: /OUTPUT INSERTED\.MessageID,\s*INSERTED\.SentAt/gi, replacement: 'RETURNING MessageID, SentAt' },
    { regex: /OUTPUT inserted\./gi, replacement: 'RETURNING ' }
]);

// 5. promotions.service.ts
let promotions = fs.readFileSync('src/promotions/promotions.service.ts', 'utf8');
promotions = promotions.replace(/;\s*SELECT SCOPE_IDENTITY\(\) AS PromotionID;/g, '\n      RETURNING PromotionID;');
fs.writeFileSync('src/promotions/promotions.service.ts', promotions, 'utf8');

// 6. users.service.ts
processFile('src/users/users.service.ts', [
    { regex: /OUTPUT inserted\.RoleID/g, replacement: 'RETURNING RoleID' },
    { regex: /OUTPUT inserted\.UserID,\s*inserted\.FullName,\s*inserted\.Email,\s*inserted\.Phone/g, replacement: 'RETURNING UserID, FullName, Email, Phone' },
    { regex: /OUTPUT inserted\.UserID,\s*inserted\.FullName,\s*inserted\.Email,\s*inserted\.IsLocked/g, replacement: 'RETURNING UserID, FullName, Email, IsLocked' }
]);

// 7. gateway/events.gateway.ts
processFile('src/gateway/events.gateway.ts', [
    { regex: /N'Hoàn thành'/g, replacement: "'Hoàn thành'" },
    { regex: /N'Chưa thanh toán'/g, replacement: "'Chưa thanh toán'" },
    { regex: /N'Đã thanh toán'/g, replacement: "'Đã thanh toán'" }
]);

// 8. orders.service.ts
processFile('src/orders/orders.service.ts', [
    { regex: /N'Đã thanh toán'/g, replacement: "'Đã thanh toán'" },
    { regex: /N'Đã hủy'/g, replacement: "'Đã hủy'" },
    { regex: /GETDATE\(\)/g, replacement: 'CURRENT_TIMESTAMP' }
]);

// 9. products.service.ts
processFile('src/products/products.service.ts', [
    { regex: /N'Đã hủy'/g, replacement: "'Đã hủy'" }
]);

// 10. reviews.service.ts
processFile('src/reviews/reviews.service.ts', [
    { regex: /N'Hoàn thành'/g, replacement: "'Hoàn thành'" }
]);

// 2. chatbot.service.ts
let chatbot = fs.readFileSync('src/chatbot/chatbot.service.ts', 'utf8');
chatbot = chatbot.replace(/SELECT TOP 2 PromoCode/g, 'SELECT PromoCode');
chatbot = chatbot.replace(/ORDER BY CreatedAt DESC/g, 'ORDER BY CreatedAt DESC\n          LIMIT 2');
if (chatbot.includes('SELECT TOP 2')) {
  chatbot = chatbot.replace(/SELECT TOP 2 (.*?)\n([\s\S]*?)WHERE GETDATE\(\) BETWEEN (.*)/g, 'SELECT $1\n$2WHERE CURRENT_TIMESTAMP BETWEEN $3\n            LIMIT 2');
}
fs.writeFileSync('src/chatbot/chatbot.service.ts', chatbot, 'utf8');
console.log('Fixed chatbot.service.ts');

console.log('All replacements executed');
