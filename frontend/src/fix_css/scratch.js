const fs = require('fs');
const foods = ['Ph? Bò', 'Bún Ch?', 'Bún Bò Hu?', 'Com T?m', 'G?i Cu?n', 'Bánh Mì Th?t', 'Bánh Xèo', 'Com Chiên H?i S?n', 'Mì Qu?ng', 'H? Ti?u Nam Vang', 'Gà Rán', 'Pizza H?i S?n', 'Burger Bò', 'Mì Ý S?t Bò Bam', 'Sushi Th?p C?m', 'Salad Cá H?i', 'Bò Bít T?t', 'Com Cà Ri Gà', 'Canh Chua Cá Lóc', 'Th?t Kho Tàu'];
const drinks = ['Trà S?a Trân Châu', 'Cà Phê S?a Ðá', 'Trà Ðào Cam S?', 'Sinh T? Bo', 'Nu?c Ép Dua H?u', 'Trà V?i', 'Trà Xanh Matcha', 'Soda Chanh Dây', 'Nu?c Ép Táo', 'Sinh T? Xoài'];
const snacks = ['Bánh Tráng Tr?n', 'Khoai Tây Chiên', 'Gà Xiên Que', 'Xúc Xích Ð?c', 'Bánh Tráng Nu?ng', 'B?p Xào Tr?ng Mu?i', 'Phô Mai Que', 'Bánh Bao Chiên', 'Há C?o H?p', 'Ch? Giò'];

let sql = '-- SEED DATA FOR PRODUCTS (40 items)\n';
sql += 'INSERT INTO Products (ProductName, CategoryID, Price, Inventory, ImageURL, Ingredients, IsActive) VALUES\n';

for(let i=0; i<20; i++) {
  const p = foods[i];
  const price = Math.floor(Math.random() * 8 + 3) * 10000;
  const isLast = (i===19 && drinks.length===0 && snacks.length===0);
  sql += '(' + 'N\'' + p + '\', 1, ' + price + ', 100, \'??\', N\'Nguyên li?u tuoi ngon, ch? bi?n d?m dà\', 1)' + (isLast ? ';' : ',') + '\n';
}
for(let i=0; i<10; i++) {
  const p = drinks[i];
  const price = Math.floor(Math.random() * 3 + 2) * 10000;
  const isLast = (i===9 && snacks.length===0);
  sql += '(' + 'N\'' + p + '\', 2, ' + price + ', 100, \'??\', N\'Nu?c trái cây tuoi, trà d?m v?\', 1)' + (isLast ? ';' : ',') + '\n';
}
for(let i=0; i<10; i++) {
  const p = snacks[i];
  const price = Math.floor(Math.random() * 4 + 1) * 10000;
  const isLast = (i===9);
  sql += '(' + 'N\'' + p + '\', 3, ' + price + ', 100, \'??\', N\'An v?t giòn r?m, h?p d?n\', 1)' + (isLast ? ';' : ',') + '\n';
}

sql += '\n-- SEED DATA FOR REVIEWS (Randomly generated for products)\n';
sql += '-- Luu ý: Ph?i có ít nh?t UserID=1 và OrderID=1 trong DB d? ch?y insert Reviews. Hãy d?m b?o di?u ki?n này ho?c s?a l?i ID cho phù h?p.\n';
sql += 'INSERT INTO Reviews (UserID, ProductID, OrderID, Rating, Comment, IsHidden) VALUES\n';

for(let pId=1; pId<=40; pId++) {
  const numReviews = Math.floor(Math.random() * 3) + 1; // 1-3 reviews per product
  for(let j=0; j<numReviews; j++) {
    const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5
    const comments = ['R?t ngon!', 'Tuy?t v?i, s? ?ng h? ti?p.', 'Món an khá ?n.', 'Ðóng gói c?n th?n, v? v?a mi?ng.', 'S? gi?i thi?u cho b?n bè.'];
    const comment = comments[Math.floor(Math.random() * comments.length)];
    const isLast = (pId === 40 && j === numReviews - 1);
    sql += '(1, (SELECT TOP 1 ProductID FROM Products ORDER BY ProductID DESC OFFSET ' + (40 - pId) + ' ROWS), 1, ' + rating + ', N\'' + comment + '\', 0)' + (isLast ? ';' : ',') + '\n';
  }
}
fs.writeFileSync('database/seed_40_products.sql', sql, 'utf8');
console.log('Done!');

