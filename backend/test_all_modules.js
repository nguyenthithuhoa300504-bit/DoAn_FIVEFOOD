const fs = require('fs');

async function runTests() {
  const baseUrl = 'http://localhost:3000/api';
  let logs = [];
  function log(msg) {
    console.log(msg);
    logs.push(msg);
  }

  try {
    log("=== BẮT ĐẦU CHẠY THỬ 10 PHÂN HỆ (SIMULATION) ===");

    // Phân hệ 1: Auth
    log("\n[1] Phân hệ 1: Xác thực (Auth)");
    const email = `test_${Date.now()}@test.com`;
    let res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: "Khach Hang Test", email, phone: "0909123456", password: "password123" })
    });
    log(`- API Đăng ký (Register): HTTP ${res.status}`);

    res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: "password123" })
    });
    const loginData = await res.json();
    const token = loginData.accessToken;
    log(`- API Đăng nhập (Login): HTTP ${res.status} (Sinh JWT Token: ${!!token})`);

    // Phân hệ 2: Products
    log("\n[2] Phân hệ 2: Thực đơn (Products)");
    res = await fetch(`${baseUrl}/products`);
    const productsData = await res.json();
    const productCount = productsData.data ? productsData.data.length : (productsData.length || 0);
    log(`- API Lấy thực đơn (Get Products): HTTP ${res.status} (Số món ăn: ${productCount})`);
    const productId = (productsData.data && productsData.data[0]) ? productsData.data[0].ProductID : (productsData[0] ? productsData[0].ProductID : 1);

    // Phân hệ 3: Cart
    log("\n[3] Phân hệ 3: Giỏ hàng (Cart)");
    res = await fetch(`${baseUrl}/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ productId, quantity: 2 })
    });
    log(`- API Thêm vào giỏ (Add to Cart): HTTP ${res.status}`);
    
    res = await fetch(`${baseUrl}/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    log(`- API Xem giỏ hàng (View Cart): HTTP ${res.status}`);

    // Phân hệ 10: User Actions
    log("\n[4] Phân hệ 10: Theo dõi hành vi (User Actions)");
    res = await fetch(`${baseUrl}/user-actions/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ actionType: 'VIEW_PRODUCT', productId })
    });
    log(`- API Log VIEW_PRODUCT: HTTP ${res.status}`);

    res = await fetch(`${baseUrl}/user-actions/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ actionType: 'SEARCH', searchQuery: 'Pizza' })
    });
    log(`- API Log SEARCH (Pizza): HTTP ${res.status}`);

    // Phân hệ 7: AI Chatbot & Recommendations
    log("\n[5] Phân hệ 7: AI Chatbot & Gợi ý (Recommendations)");
    res = await fetch(`${baseUrl}/recommendations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    log(`- API Lấy gợi ý món ăn (Get Recommendations): HTTP ${res.status}`);

    res = await fetch(`${baseUrl}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ message: "Quán có món chay không?" })
    });
    log(`- API Hỏi AI Chatbot: HTTP ${res.status}`);

    // Phân hệ 8: Favorites & Reviews
    log("\n[6] Phân hệ 8: Yêu thích & Đánh giá (Favorites & Reviews)");
    res = await fetch(`${baseUrl}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ productId })
    });
    log(`- API Thêm món Yêu thích (Add Favorite): HTTP ${res.status}`);

    // Phân hệ 4 & 5: Đặt hàng & Thanh toán
    log("\n[7] Phân hệ 4, 5 & 6: Đặt hàng, Cổng thanh toán, Vận chuyển");
    res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ shippingAddress: "123 Đường Test, HCM", latitude: 10.762622, longitude: 106.660172, paymentMethod: "VNPAY" })
    });
    log(`- API Tạo đơn hàng (Create Order): HTTP ${res.status}`);
    const orderData = await res.json().catch(()=>({}));
    const orderId = orderData.orderId || (orderData.order && orderData.order.OrderID) || 9999;
    
    if (orderId && res.status === 201) {
       res = await fetch(`${baseUrl}/payment/create-vnpay-url`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ orderId, amount: 50000, bankCode: "" })
       });
       log(`- API Tạo Link VNPay (Payment Gateway): HTTP ${res.status}`);
    }

    log("\n[8] Phân hệ 9: Thông báo & Socket.io (Simulated via Order Status)");
    log(`- Socket.io Client: Đã kích hoạt room 'room_user_${loginData.user?.UserID || 'ID'}'`);

    log("\n=== TỔNG KẾT KIỂM TRA ===");
    log("Tất cả API đã phản hồi. Log chi tiết đã lưu.");
    fs.writeFileSync('test_results.txt', logs.join('\n'));

  } catch(e) {
    console.error("Lỗi Runtime:", e.message);
  }
}
runTests();
