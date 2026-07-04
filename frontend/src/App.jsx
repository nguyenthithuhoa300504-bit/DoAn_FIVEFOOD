import React, { useState, useEffect } from 'react';
import { useCart } from './context/CartContext';
import { apiFetch } from './utils/apiFetch';
import './App.css';

// Đọc địa chỉ API Backend từ biến môi trường của Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Danh sách món ăn mẫu (Mockup) hiển thị dự phòng nếu database trống
const MOCK_PRODUCTS = [
  { ProductID: 1, ProductName: 'Bánh Mì Thịt Nướng', CategoryID: 1, CategoryName: 'Bánh mì', Price: 25000, Inventory: 10, ImageURL: '🥖', IsActive: true },
  { ProductID: 2, ProductName: 'Phở Bò Đặc Biệt', CategoryID: 2, CategoryName: 'Bún Phở', Price: 45000, Inventory: 5, ImageURL: '🍜', IsActive: true },
  { ProductID: 3, ProductName: 'Pizza Hải Sản Viền Phô Mai', CategoryID: 3, CategoryName: 'Pizza', Price: 129000, Inventory: 12, ImageURL: '🍕', IsActive: true },
  { ProductID: 4, ProductName: 'Trà Sữa Thái Xanh Trân Châu', CategoryID: 4, CategoryName: 'Đồ uống', Price: 30000, Inventory: 20, ImageURL: '🥤', IsActive: true }
];

function App() {
  const {
    cart,
    user,
    isLoggedIn,
    registerUser,
    loginUser,
    logout,
    addToCart,
    removeFromCart
  } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('menu'); // menu, admin, login, register
  
  // States cho Form Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // States cho Admin Panel (CRUD Products & Categories)
  const [productForm, setProductForm] = useState({
    id: null,
    productName: '',
    categoryId: '',
    price: '',
    inventory: '',
    imageUrl: '🍔'
  });
  const [categoryForm, setCategoryForm] = useState({
    categoryName: '',
    description: ''
  });
  const [adminSuccess, setAdminSuccess] = useState('');
  const [adminError, setAdminError] = useState('');
  const [selectedHistory, setSelectedHistory] = useState(null); // Lịch sử Temporal Table của sản phẩm được chọn

  // Tải danh sách sản phẩm từ backend
  const fetchProducts = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/products?limit=50`);
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
      } else {
        setProducts(MOCK_PRODUCTS);
      }
    } catch (err) {
      console.warn('Lỗi kết nối Backend hoặc chưa có sản phẩm. Hiển thị dữ liệu mẫu.');
      setProducts(MOCK_PRODUCTS);
    }
  };

  // Tải danh sách danh mục
  const fetchCategories = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/categories`);
      setCategories(data);
    } catch (err) {
      console.warn('Không tải được danh mục từ Backend.');
      setCategories([
        { CategoryID: 1, CategoryName: 'Bánh mì' },
        { CategoryID: 2, CategoryName: 'Bún Phở' },
        { CategoryID: 3, CategoryName: 'Pizza' },
        { CategoryID: 4, CategoryName: 'Đồ uống' }
      ]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [isLoggedIn]);

  // Tính tổng số lượng và tổng tiền trong giỏ hàng
  const totalItems = cart.reduce((sum, item) => sum + item.Quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.Price * item.Quantity), 0);

  // Đăng ký
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
      setTimeout(() => setActiveTab('login'), 1500);
    } else {
      setAuthError(res.message);
    }
  };

  // Đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    const res = await loginUser(email, password);
    if (res.success) {
      setAuthSuccess('Đăng nhập thành công!');
      setEmail('');
      setPassword('');
      setTimeout(() => setActiveTab('menu'), 1000);
    } else {
      setAuthError(res.message);
    }
  };

  // Admin: Submit sản phẩm mới / Cập nhật sản phẩm
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setAdminSuccess('');
    setAdminError('');

    const bodyData = {
      productName: productForm.productName,
      categoryId: parseInt(productForm.categoryId, 10),
      price: parseFloat(productForm.price),
      inventory: parseInt(productForm.inventory, 10),
      imageUrl: productForm.imageUrl
    };

    try {
      if (productForm.id) {
        // Cập nhật sản phẩm
        await apiFetch(`${API_BASE_URL}/admin/products/${productForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(bodyData)
        });
        setAdminSuccess('Cập nhật món ăn thành công!');
      } else {
        // Tạo sản phẩm mới
        await apiFetch(`${API_BASE_URL}/admin/products`, {
          method: 'POST',
          body: JSON.stringify(bodyData)
        });
        setAdminSuccess('Tạo món ăn mới thành công!');
      }

      // Reset form và reload
      setProductForm({ id: null, productName: '', categoryId: '', price: '', inventory: '', imageUrl: '🍔' });
      fetchProducts();
    } catch (err) {
      setAdminError(err.message || 'Lỗi khi lưu sản phẩm.');
    }
  };

  // Admin: Submit danh mục mới
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setAdminSuccess('');
    setAdminError('');

    try {
      await apiFetch(`${API_BASE_URL}/admin/categories`, {
        method: 'POST',
        body: JSON.stringify(categoryForm)
      });
      setAdminSuccess('Tạo danh mục mới thành công!');
      setCategoryForm({ categoryName: '', description: '' });
      fetchCategories();
    } catch (err) {
      setAdminError(err.message || 'Lỗi khi lưu danh mục.');
    }
  };

  // Admin: Đọc lịch sử thay đổi của sản phẩm (Temporal Table)
  const loadProductHistory = async (productId) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/admin/products/${productId}/history`);
      setSelectedHistory(data);
    } catch (err) {
      alert('Lỗi khi tải lịch sử: ' + err.message);
    }
  };

  // Admin: Khóa mềm / ngừng bán món ăn
  const handleSoftDelete = async (productId) => {
    if (!confirm('Bạn có chắc muốn ngừng bán sản phẩm này?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/admin/products/${productId}`, {
        method: 'DELETE'
      });
      setAdminSuccess('Đã ngừng bán món ăn thành công.');
      fetchProducts();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  // Admin: Bật lại sản phẩm
  const handleRestoreProduct = async (productId) => {
    try {
      await apiFetch(`${API_BASE_URL}/admin/products/${productId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true })
      });
      setAdminSuccess('Kích hoạt bán lại món ăn thành công.');
      fetchProducts();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass-panel header-bar fade-in">
        <div className="logo-section">
          <span className="logo-emoji">🍕</span>
          <h1>FIVEFOOD</h1>
          <span className="logo-badge">Dynamic Menu v1.0</span>
        </div>

        <div className="nav-controls">
          <button 
            className={`nav-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            🍽 Thực đơn
          </button>

          {isLoggedIn && user?.role === 'Admin' && (
            <button 
              className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('admin'); setAdminSuccess(''); setAdminError(''); }}
            >
              🛠 Quản trị
            </button>
          )}
          
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
                {products.filter(p => p.IsActive || p.IsActive === undefined).map((product) => (
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

        {/* Tab Admin (CRUD Thực đơn và Kho) */}
        {activeTab === 'admin' && isLoggedIn && user?.role === 'Admin' && (
          <div className="admin-grid fade-in">
            {/* Form quản lý */}
            <div className="admin-forms">
              {/* Product Form */}
              <div className="glass-panel admin-form-card">
                <h3>{productForm.id ? '✏️ Cập Nhật Món Ăn' : '➕ Thêm Món Ăn Mới'}</h3>
                {adminSuccess && <div className="alert alert-success">{adminSuccess}</div>}
                {adminError && <div className="alert alert-danger">{adminError}</div>}
                
                <form onSubmit={handleProductSubmit}>
                  <div className="form-group">
                    <label>Tên món ăn</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={productForm.productName}
                      onChange={(e) => setProductForm({...productForm, productName: e.target.value})}
                      placeholder="Ví dụ: Phở Gà Ngon" 
                      required 
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Danh mục</label>
                      <select 
                        className="form-control"
                        value={productForm.categoryId}
                        onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                        required
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map(cat => (
                          <option key={cat.CategoryID} value={cat.CategoryID}>{cat.CategoryName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Biểu tượng emoji</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={productForm.imageUrl}
                        onChange={(e) => setProductForm({...productForm, imageUrl: e.target.value})}
                        placeholder="🍔" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Giá bán (đ)</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        placeholder="35000" 
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label>Số lượng kho</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={productForm.inventory}
                        onChange={(e) => setProductForm({...productForm, inventory: e.target.value})}
                        placeholder="50" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="btn-group-admin">
                    <button type="submit" className="btn btn-primary">{productForm.id ? 'Cập Nhật' : 'Thêm Mới'}</button>
                    {productForm.id && (
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setProductForm({ id: null, productName: '', categoryId: '', price: '', inventory: '', imageUrl: '🍔' })}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Category Form */}
              <div className="glass-panel admin-form-card" style={{ marginTop: '20px' }}>
                <h3>📁 Tạo Danh Mục Mới</h3>
                <form onSubmit={handleCategorySubmit}>
                  <div className="form-group">
                    <label>Tên danh mục</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={categoryForm.categoryName}
                      onChange={(e) => setCategoryForm({...categoryForm, categoryName: e.target.value})}
                      placeholder="Ví dụ: Đồ ăn vặt" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Mô tả</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                      placeholder="Các món ăn vặt giòn ngon" 
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary w-full">Tạo Danh Mục</button>
                </form>
              </div>
            </div>

            {/* List products for admin */}
            <div className="admin-list glass-panel">
              <div className="list-header">
                <h2>Danh Sách Thực Đơn & Kho Hàng</h2>
                <p className="text-muted">Quản lý và xem lịch sử cập nhật giá/kho (Temporal Tables)</p>
              </div>

              <div className="admin-products-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Tên Món</th>
                      <th>Danh Mục</th>
                      <th>Giá Bán</th>
                      <th>Kho</th>
                      <th>Trạng Thái</th>
                      <th>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(prod => (
                      <tr key={prod.ProductID}>
                        <td><span className="table-emoji">{prod.ImageURL || '🍔'}</span></td>
                        <td><strong>{prod.ProductName}</strong></td>
                        <td>{prod.CategoryName}</td>
                        <td className="text-orange">{prod.Price.toLocaleString('vi-VN')} đ</td>
                        <td>{prod.Inventory}</td>
                        <td>
                          <span className={`status-pill ${prod.IsActive || prod.IsActive === undefined ? 'active' : 'inactive'}`}>
                            {prod.IsActive || prod.IsActive === undefined ? 'Đang bán' : 'Ngừng bán'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            <button 
                              className="btn btn-secondary btn-icon-sm"
                              title="Sửa món ăn"
                              onClick={() => setProductForm({
                                id: prod.ProductID,
                                productName: prod.ProductName,
                                categoryId: prod.CategoryID,
                                price: prod.Price,
                                inventory: prod.Inventory,
                                imageUrl: prod.ImageURL || '🍔'
                              })}
                            >
                              ✏️
                            </button>

                            {prod.IsActive || prod.IsActive === undefined ? (
                              <button 
                                className="btn btn-danger btn-icon-sm"
                                title="Ngừng bán (Xóa mềm)"
                                onClick={() => handleSoftDelete(prod.ProductID)}
                              >
                                🔒
                              </button>
                            ) : (
                              <button 
                                className="btn btn-primary btn-icon-sm"
                                title="Kích hoạt bán lại"
                                onClick={() => handleRestoreProduct(prod.ProductID)}
                              >
                                🔓
                              </button>
                            )}

                            <button 
                              className="btn btn-info btn-icon-sm"
                              title="Xem lịch sử giá/kho"
                              onClick={() => loadProductHistory(prod.ProductID)}
                            >
                              📜 Lịch sử
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected product temporal history view */}
              {selectedHistory && selectedHistory.history && (
                <div className="temporal-history-modal glass-panel fade-in">
                  <div className="history-modal-header">
                    <h3>Lịch Sử Biến Động Giá & Tồn Kho (SQL Server Temporal)</h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedHistory(null)}>Đóng</button>
                  </div>
                  <p className="text-muted text-sm" style={{ marginBottom: '15px' }}>
                    Sản phẩm: <strong>{selectedHistory.history[0]?.ProductName || 'Món ăn'}</strong> (ID: {selectedHistory.history[0]?.ProductID})
                  </p>
                  
                  <div className="history-timeline">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Thời điểm hiệu lực</th>
                          <th>Giá Bán</th>
                          <th>Số lượng kho</th>
                          <th>Kinh doanh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedHistory.history.map((hist, idx) => (
                          <tr key={idx}>
                            <td>{new Date(hist.SysStartTime).toLocaleString('vi-VN')}</td>
                            <td className="text-orange">{hist.Price.toLocaleString('vi-VN')} đ</td>
                            <td>{hist.Inventory}</td>
                            <td>
                              <span className={`status-pill ${hist.IsActive ? 'active' : 'inactive'}`}>
                                {hist.IsActive ? 'Đang bán' : 'Ngừng bán'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
