const { Pool } = require('pg');
require('dotenv').config();

async function seed() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database to fix seed data...');
    
    // Clear old reviews and dummy orders we are about to create (if any)
    await pool.query('DELETE FROM reviews');

    const usersRes = await pool.query('SELECT userid FROM users LIMIT 5');
    const productsRes = await pool.query('SELECT productid, price FROM products LIMIT 20'); 

    if (!usersRes.rows.length || !productsRes.rows.length) {
      console.log('Error: Need at least 1 user and 1 product.');
      return;
    }

    const users = usersRes.rows;
    const products = productsRes.rows;
    let reviewCount = 0;
    
    console.log(`Creating orders and reviews for ${products.length} products...`);
    
    const sampleComments = [
      "Đồ ăn rất ngon, mình sẽ tiếp tục ủng hộ quán!",
      "Hương vị đậm đà, giao hàng cực nhanh, đồ ăn vẫn còn nóng hổi.",
      "Chất lượng tuyệt vời so với giá tiền.",
      "Đóng gói cẩn thận, món ăn vừa miệng.",
      "Khá hài lòng với món này, ăn không bị ngán.",
      "Món này là chân ái, mua đi mua lại không biết bao nhiêu lần rồi.",
      "Tuyệt vời, chấm 10 điểm cho chất lượng!",
      "Đồ ăn tươi ngon, phần ăn cũng đầy đặn."
    ];

    for (const p of products) {
        const numReviews = Math.floor(Math.random() * 2) + 2; // 2 or 3
        
        for (let i = 0; i < numReviews; i++) {
            const user = users[Math.floor(Math.random() * users.length)].userid;
            
            // 1. Create a dummy order for this user (Status = 'Hoàn thành' to count as Sold)
            const orderRes = await pool.query(
                `INSERT INTO orders (userid, totalamount, finalamount, status, shippingaddress, paymentmethod, paymentstatus) 
                 VALUES ($1, $2, $3, 'Hoàn thành', '123 Test Street', 'COD', 'Đã thanh toán') RETURNING orderid`,
                [user, p.price, p.price]
            );
            const orderId = orderRes.rows[0].orderid;

            // 2. Create order details for the product
            await pool.query(
                `INSERT INTO orderdetails (orderid, productid, quantity, unitprice) VALUES ($1, $2, $3, $4)`,
                [orderId, p.productid, 1, p.price]
            );

            // 3. Create the review linked to this order
            const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
            const comment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
            
            await pool.query(
                'INSERT INTO reviews (userid, productid, orderid, rating, comment) VALUES ($1, $2, $3, $4, $5)',
                [user, p.productid, orderId, rating, comment]
            );
            reviewCount++;
        }
    }
    
    console.log(`Successfully seeded ${reviewCount} reviews AND generated corresponding successful orders so SoldCount > 0!`);
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await pool.end();
  }
}
seed();
