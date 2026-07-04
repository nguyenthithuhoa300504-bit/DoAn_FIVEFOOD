import React, { useState, useEffect } from 'react';
import { useCart } from './context/CartContext';
import './App.css';

// Danh sách món ăn mẫu (Mockup) hiển thị dự phòng nếu database trống
const MOCK_PRODUCTS = [
  { ProductID: 1, ProductName: 'Bánh Mì Thịt Nướng', Price: 25000, Inventory: 10, ImageURL: '🥖' },
  { ProductID: 2, ProductName: 'Phở Bò Đặc Biệt', Price: 45000, Inventory: 5, ImageURL: '🍜' },
  { ProductID: 3, ProductName: 'Pizza Hải Sản Viền Phô Mai', Price: 129000, Inventory: 12, ImageURL: '🍕' },
  { ProductID: 4, ProductName: 'Trà Sữa Thái Xanh Trân Châu', Price: 30000, Inventory: 20, ImageURL: '🥤' }
];

function App() {
  const {
    cart,
    loading,
    user,
    isLoggedIn,
    registerUser,
    loginUser,
    logout,
    addToCart,
    removeFromCart
  } = useCart();

  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('menu'); // menu, login, register
  
  // States cho Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Tải danh sách sản phẩm từ backend
  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/products?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      } else {
        setProducts(MOCK_PRODUCTS);
      }
    } catch (err) {
      console.warn('Lỗi kết nối Backend. Hiển thị dữ liệu dự phòng (Mock).');
      setProducts(MOCK_PRODUCTS);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Tính tổng số lượng và tổng tiền trong giỏ hàng
  const totalItems = cart.reduce((sum, item) => sum + item.Quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.Price * item.Quantity), 0);

  // Xử lý đăng ký
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    const res = await registerUser(fullName, email, phone, password);
    if (res.success) {
      setAuthSuccess(res.message);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      // Chuyển sang tab đăng nhập sau 1.5s
      setTimeout(() => setActiveTab('login'), 1500);
    } else {
      setAuthError(res.message);
    }
  };

  // Xử lý đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    const res = await loginUser(email, password);
    if (res.success) {
      setAuthSuccess('Đăng nhập và đồng bộ giỏ hàng thành công!');
      setEmail('');
      setPassword('');
      setTimeout(() => setActiveTab('menu'), 1000);
    } else {
      setAuthError(res.message);
    }
  };

  // Tự động tạo sản phẩm mẫu vào database để test thật
  const seedProductsIntoDatabase = async () => {
    // Để gọi được cần token Admin, ở đây gọi tạo trực tiếp danh mục & món ăn
    // (Lưu ý: User phải tạo tài khoản admin hoặc chạy không cần token tùy cấu hình backend, 
    // chức năng này chủ yếu mô phỏng nạp data nhanh)
    alert('Vui lòng đăng ký/đăng nhập tài khoản Admin hoặc insert trực tiếp qua SSMS bằng file schema.sql.');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass-panel header-bar fade-in">
        <div className="logo-section">
          <span className="logo-emoji">🍕</span>
          <h1>FIVEFOOD</h1>
          <span className="logo-badge">Hybrid Cart v1.0</span>
        </div>

        <div className="nav-controls">
          <button 
            className={`nav-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            🍽 Thực đơn
          </button>
          
          {isLoggedIn ? (
            <div className="user-profile">
              <span className="user-name">👤 {user?.fullName} ({user?.role})</span>
              <button className="btn btn-secondary btn-sm" onClick={logout}>Đăng xuất</button>
            </div>
          ) : (
            <div className="auth-btn-group">
              <button 
                className={`nav-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => { setActiveTab('login'); setAuthError(''); setAuthSuccess(''); }}
              >
                Đăng nhập
              </button>
              <button 
                className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => { setActiveTab('register'); setAuthError(''); setAuthSuccess(''); }}
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'menu' && (
          <div className="menu-grid fade-in">
            {/* Left Column: Product List */}
            <div className="products-section glass-panel">
              <div className="section-header">
                <h2>Menu Món Ăn Đặc Sắc</h2>
                <p className="text-muted">Chọn món ăn nóng hổi và thêm vào giỏ hàng</p>
              </div>

              <div className="product-cards-container">
                {products.map((product) => (
                  <div key={product.ProductID} className="product-card glass-panel">
                    <div className="product-img">
                      {product.ImageURL && product.ImageURL.length < 5 ? (
                        <span className="food-emoji">{product.ImageURL}</span>
                      ) : (
                        <span className="food-emoji">🍔</span>
                      )}
                    </div>
                    <div className="product-info">
                      <h3>{product.ProductName}</h3>
                      <p className="price">{product.Price.toLocaleString('vi-VN')} đ</p>
                      <p className="inventory-status">
                        Còn lại: <span className="inv-qty">{product.Inventory}</span> món
                      </p>
                    </div>
                    <button 
                      className="btn btn-primary btn-add-cart"
                      onClick={() => addToCart(product, 1)}
                    >
                      🛒 Thêm giỏ hàng
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Cart Detail */}
            <div className="cart-section glass-panel">
              <div className="section-header-cart">
                <div className="cart-title-row">
                  <h2>Giỏ Hàng Của Bạn</h2>
                  <span className="cart-count-badge">{totalItems} món</span>
                </div>
                {isLoggedIn ? (
                  <span className="sync-badge db-synced">⚡ Đã đồng bộ với Database SQL Server</span>
                ) : (
                  <span className="sync-badge local-stored">💾 Đang lưu tạm ở LocalStorage (Chưa đăng nhập)</span>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="empty-cart-view">
                  <span className="empty-emoji">🛒</span>
                  <p>Giỏ hàng của bạn đang trống.</p>
                  <p className="text-muted text-sm">Hãy chọn món ngon bên trái để thưởng thức nhé!</p>
                </div>
              ) : (
                <div className="cart-items-list">
                  {cart.map((item) => (
                    <div key={item.ProductID} className="cart-item glass-panel">
                      <div className="cart-item-info">
                        <h4>{item.ProductName}</h4>
                        <p className="cart-item-price">{item.Price.toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div className="cart-item-actions">
                        <div className="quantity-controls">
                          <button 
                            className="qty-btn"
                            onClick={() => addToCart(item, -1)}
                          >
                            -
                          </button>
                          <span className="qty-val">{item.Quantity}</span>
                          <button 
                            className="qty-btn"
                            onClick={() => addToCart(item, 1)}
                          >
                            +
                          </button>
                        </div>
                        <button 
                          className="btn-delete"
                          onClick={() => removeFromCart(item.ProductID)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="cart-summary glass-panel">
                    <div className="summary-row">
                      <span>Tổng tiền hàng:</span>
                      <span className="total-amount">{totalPrice.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <button 
                      className="btn btn-primary w-full btn-checkout"
                      onClick={() => alert(isLoggedIn ? 'Tiến hành đặt hàng! (Phân hệ 4)' : 'Vui lòng đăng nhập để tiến hành đặt hàng.')}
                    >
                      Đặt Hàng Ngay
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Đăng nhập */}
        {activeTab === 'login' && (
          <div className="auth-container glass-panel fade-in">
            <h2>Đăng Nhập</h2>
            <p className="text-muted">Đăng nhập để tự động đồng bộ giỏ hàng lên hệ thống</p>

            {authError && <div className="alert alert-danger">{authError}</div>}
            {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email đăng nhập</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhapemail@example.com" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">Đăng Nhập</button>
            </form>
            <p className="auth-footer">
              Chưa có tài khoản?{' '}
              <span onClick={() => { setActiveTab('register'); setAuthError(''); setAuthSuccess(''); }}>Đăng ký ngay</span>
            </p>
          </div>
        )}

        {/* Tab Đăng ký */}
        {activeTab === 'register' && (
          <div className="auth-container glass-panel fade-in">
            <h2>Đăng Ký Tài Khoản</h2>
            <p className="text-muted">Tạo tài khoản mới để trải nghiệm đặt đồ ăn tiện lợi nhất</p>

            {authError && <div className="alert alert-danger">{authError}</div>}
            {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Họ và Tên</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XXXXXXXX" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Email đăng ký</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhapemail@example.com" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">Đăng Ký</button>
            </form>
            <p className="auth-footer">
              Đã có tài khoản?{' '}
              <span onClick={() => { setActiveTab('login'); setAuthError(''); setAuthSuccess(''); }}>Đăng nhập ngay</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
