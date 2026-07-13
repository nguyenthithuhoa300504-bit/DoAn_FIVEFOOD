import React, { useState, useEffect, useRef } from 'react';
import { useCart } from './context/CartContext';
import { apiFetch } from './utils/apiFetch';
import L from 'leaflet';
import io from 'socket.io-client';
import Chatbot from './components/AIChatbot/Chatbot';
import RecommendationSection from './components/Recommendations/RecommendationSection';
import FavoriteList from './components/Favorites/FavoriteList';
import ReviewModal from './components/Reviews/ReviewModal';
import ProductReviewsModal from './components/Reviews/ProductReviewsModal';
import './App.css';

// Đọc địa chỉ API Backend từ biến môi trường của Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Tọa độ cửa hàng cố định (Hà Nội làm trung tâm)
const STORE_COORDS = [21.0285, 105.8542];

// Component bản đồ Leaflet tích hợp trực tiếp không qua react-leaflet để tránh conflict React 19
function LeafletMap({ onLocationSelected }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      // Khởi tạo bản đồ tại Hà Nội
      mapInstance.current = L.map(mapRef.current).setView(STORE_COORDS, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      // Thêm marker cửa hàng
      L.marker(STORE_COORDS, {
        icon: L.divIcon({
          html: '<span style="font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🏪</span>',
          className: 'store-emoji-icon',
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance.current).bindPopup('<b>Cửa hàng FIVEFOOD</b><br/>Tọa độ: Hanoi Center').openPopup();

      // Sự kiện click trên bản đồ để chọn tọa độ giao hàng
      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        if (markerInstance.current) {
          markerInstance.current.setLatLng(e.latlng);
        } else {
          markerInstance.current = L.marker(e.latlng, {
            icon: L.divIcon({
              html: '<span style="font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">📍</span>',
              className: 'user-emoji-icon',
              iconAnchor: [15, 15]
            })
          }).addTo(mapInstance.current);
        }

        onLocationSelected(lat, lng);
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
      }
    };
  }, [onLocationSelected]);

  return (
    <div style={{ margin: '10px 0' }}>
      <label style={{ display: 'block', fontSize: '12px', color: '#ff5722', marginBottom: '5px', fontWeight: 'bold' }}>
        🗺️ Click vào bản đồ để chọn vị trí giao hàng:
      </label>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '220px', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }} 
      />
    </div>
  );
}

// Component bản đồ Delivery Tracking mô phỏng lộ trình Shipper
function DeliveryTrackingMap({ customerLat, customerLng, shipperLat, shipperLng }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const shipperMarker = useRef(null);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView(STORE_COORDS, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

      // Điểm Cửa hàng
      L.marker(STORE_COORDS, {
        icon: L.divIcon({
          html: '<span style="font-size: 30px;">🏪</span>',
          className: 'store-emoji-icon',
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance.current).bindPopup('FIVEFOOD').openPopup();

      // Điểm Khách hàng
      L.marker([customerLat, customerLng], {
        icon: L.divIcon({
          html: '<span style="font-size: 30px;">📍</span>',
          className: 'user-emoji-icon',
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance.current).bindPopup('Bạn ở đây');

      // Vẽ đường dẫn nối Cửa hàng - Khách hàng
      L.polyline([STORE_COORDS, [customerLat, customerLng]], { color: 'blue', dashArray: '5, 10' }).addTo(mapInstance.current);

      // Điểm Shipper
      shipperMarker.current = L.marker([shipperLat || STORE_COORDS[0], shipperLng || STORE_COORDS[1]], {
        icon: L.divIcon({
          html: '<span style="font-size: 30px; transform: scaleX(-1); display: inline-block;">🛵</span>',
          className: 'shipper-emoji-icon',
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance.current);
    } else if (mapInstance.current && shipperMarker.current && shipperLat && shipperLng) {
      // Cập nhật vị trí Shipper
      shipperMarker.current.setLatLng([shipperLat, shipperLng]);
    }
  }, [customerLat, customerLng, shipperLat, shipperLng]);

  return (
    <div style={{ margin: '15px 0' }}>
      <label style={{ display: 'block', fontSize: '14px', color: '#ff5722', marginBottom: '10px', fontWeight: 'bold' }}>
        🛵 Bản đồ theo dõi Shipper trực tiếp:
      </label>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '250px', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }} 
      />
    </div>
  );
}

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
    removeFromCart,
    fetchCartFromServer
  } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('menu'); // menu, orders, admin, login, register
  
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

  // --- States Phân hệ 4: Đặt hàng & Khuyến mãi ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [shippingFee, setShippingFee] = useState(0);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [checkoutError, setCheckoutError] = useState('');
  
  const [clientOrders, setClientOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminChatbotLogs, setAdminChatbotLogs] = useState([]);
  const [adminSubtab, setAdminSubtab] = useState('products'); // products, orders
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  // States cho Phân hệ 8: Đánh giá & Yêu thích
  const [reviewProductData, setReviewProductData] = useState(null);
  const [viewReviewsProduct, setViewReviewsProduct] = useState(null);

  // Realtime Delivery Socket State
  const [socket, setSocket] = useState(null);
  const [shipperLocation, setShipperLocation] = useState(null);

  // Khởi tạo Socket.io khi user đăng nhập
  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      const newSocket = io(API_BASE_URL.replace('/api', ''), {
        auth: { token }
      });

      newSocket.on('orderStatusUpdate', (data) => {
        // Cập nhật UI ngầm
        fetchClientOrders();
        fetchAdminOrders();
        
        // Nếu đang mở chi tiết đơn này
        setSelectedOrderDetails(prev => {
          if (prev && prev.OrderID === data.orderId) {
            return { ...prev, Status: data.status };
          }
          return prev;
        });
      });

      newSocket.on('shipperLocation', (data) => {
        setShipperLocation({
          orderId: data.orderId,
          lat: data.lat,
          lng: data.lng,
          progress: data.progress
        });
      });

      newSocket.on('deliveryCompleted', (data) => {
        setShipperLocation(null);
        alert(`🎉 Đơn hàng #${data.orderId} của bạn đã được giao thành công!`);
      });

      setSocket(newSocket);
      return () => newSocket.close();
    } else {
      if (socket) socket.close();
    }
  }, [isLoggedIn]);

  // Tải danh sách đơn hàng cho Khách hàng
  const fetchClientOrders = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/orders`);
      setClientOrders(data);
    } catch (err) {
      console.error('Không tải được lịch sử đơn hàng:', err);
    }
  };

  // Tải danh sách đơn hàng toàn hệ thống cho Admin
  const fetchAdminOrders = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/admin/orders`);
      setAdminOrders(data);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng admin', err);
    }
  };

  const fetchChatbotLogs = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/chatbot/logs`);
      if (data && data.success) {
        setAdminChatbotLogs(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải nhật ký chatbot', err);
    }
  };

  // Xem chi tiết đơn hàng
  const loadOrderDetails = async (orderId, isAdmin = false) => {
    try {
      const url = isAdmin ? `${API_BASE_URL}/admin/orders/${orderId}` : `${API_BASE_URL}/orders/${orderId}`;
      const data = await apiFetch(url);
      setSelectedOrderDetails(data);
    } catch (err) {
      alert('Lỗi tải chi tiết đơn hàng: ' + err.message);
    }
  };

  // Admin cập nhật trạng thái đơn hàng
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await apiFetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchAdminOrders();
      if (selectedOrderDetails && selectedOrderDetails.OrderID === orderId) {
        loadOrderDetails(orderId, true);
      }
    } catch (err) {
      alert('Lỗi cập nhật trạng thái: ' + err.message);
    }
  };

  // Khách hàng tự hủy đơn hàng (trạng thái Chờ xác nhận)
  const handleCancelOrder = async (orderId) => {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
        method: 'PUT'
      });
      alert('Đã hủy đơn hàng thành công.');
      fetchClientOrders();
      if (selectedOrderDetails && selectedOrderDetails.OrderID === orderId) {
        setSelectedOrderDetails(null); // Đóng modal chi tiết
      }
    } catch (err) {
      alert('Hủy đơn hàng thất bại: ' + err.message);
    }
  };

  // Tải khoảng cách qua OSRM API và tính phí ship tự động
  const handleLocationSelected = async (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setCheckoutError('');
    try {
      // OSRM format: lon,lat
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/105.8542,21.0285;${lng},${lat}?overview=false`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = route.distance / 1000;
        setDistance(distKm);
        setDuration(route.duration);
        // Tính phí ship: 5000đ/km, tối thiểu 15.000đ
        const fee = Math.max(15000, Math.round(distKm * 5000));
        setShippingFee(fee);
      } else {
        setShippingFee(15000);
      }
    } catch (err) {
      console.error('Lỗi tính quãng đường OSRM:', err);
      setShippingFee(15000); // Mức phí giao mặc định
    }
  };

  // Kiểm tra & áp dụng Voucher
  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoSuccess('');
    if (!promoCodeInput.trim()) return;
    try {
      const data = await apiFetch(`${API_BASE_URL}/orders/validate-promo`, {
        method: 'POST',
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          totalAmount: totalPrice
        })
      });
      if (data.valid) {
        setDiscountAmount(data.discountAmount);
        setAppliedPromo(data.promoCode);
        setPromoSuccess(`${data.message} (Giảm -${data.discountAmount.toLocaleString('vi-VN')} đ)`);
      } else {
        setPromoError(data.message);
        setDiscountAmount(0);
        setAppliedPromo('');
      }
    } catch (err) {
      setPromoError(err.message || 'Lỗi khi áp dụng mã.');
    }
  };

  // Tiến hành thanh toán / đặt đơn hàng
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setCheckoutError('');
    
    if (!shippingAddress.trim()) {
      setCheckoutError('Vui lòng điền địa chỉ giao hàng.');
      return;
    }
    if (!latitude || !longitude) {
      setCheckoutError('Vui lòng bấm chọn vị trí giao hàng trên bản đồ số.');
      return;
    }

    try {
      const orderData = {
        shippingAddress,
        latitude,
        longitude,
        paymentMethod,
        promoCode: appliedPromo || null,
        shippingFee
      };

      const result = await apiFetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      // Nếu chọn thanh toán VNPAY, gọi tiếp API tạo link và chuyển hướng
      if (paymentMethod === 'VNPAY') {
        const paymentRes = await apiFetch(`${API_BASE_URL}/payment/create-vnpay-url`, {
          method: 'POST',
          body: JSON.stringify({ orderId: result.OrderID })
        });
        if (paymentRes && paymentRes.paymentUrl) {
          setIsCheckoutOpen(false);
          setShippingAddress('');
          setLatitude(null);
          setLongitude(null);
          setDistance(null);
          setDuration(null);
          setShippingFee(0);
          setPromoCodeInput('');
          setAppliedPromo('');
          setDiscountAmount(0);
          setPromoSuccess('');
          await fetchCartFromServer();
          window.location.href = paymentRes.paymentUrl;
          return;
        }
      }

      alert(`Đặt hàng thành công! Mã hóa đơn: #${result.OrderID}`);
      
      // Xóa các state tạm
      setIsCheckoutOpen(false);
      setShippingAddress('');
      setLatitude(null);
      setLongitude(null);
      setDistance(null);
      setDuration(null);
      setShippingFee(0);
      setPromoCodeInput('');
      setAppliedPromo('');
      setDiscountAmount(0);
      setPromoSuccess('');
      
      // Đồng bộ lại giỏ hàng từ server để cập nhật trống
      await fetchCartFromServer();
      
      // Chuyển sang tab xem lịch sử đơn hàng
      setActiveTab('orders');
      fetchClientOrders();
    } catch (err) {
      setCheckoutError(err.message || 'Lỗi xảy ra khi tạo đơn hàng.');
    }
  };

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

  // Thêm vào danh sách yêu thích
  const handleAddFavorite = async (productId) => {
    if (!isLoggedIn) {
      alert('Vui lòng đăng nhập để lưu món yêu thích.');
      setActiveTab('login');
      return;
    }
    try {
      await apiFetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        body: JSON.stringify({ productId })
      });
      alert('💖 Đã thêm vào danh sách yêu thích!');
    } catch (err) {
      alert(err.message || 'Sản phẩm đã có trong danh sách yêu thích!');
    }
  };

  // Đón nhận tham số VNPay redirect trả về
  useEffect(() => {
    const searchString = window.location.search;
    const queryParams = new URLSearchParams(searchString);
    const responseCode = queryParams.get('vnp_ResponseCode');
    const txnRef = queryParams.get('vnp_TxnRef');
    if (responseCode && txnRef) {
      // Dọn sạch query string trên URL trình duyệt để tránh lặp lại giao dịch khi F5
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const verifyPayment = async () => {
        try {
          const res = await apiFetch(`${API_BASE_URL}/payment/vnpay-return${searchString}`);
          setPaymentResult({
            success: res.success,
            orderId: txnRef,
            message: res.message
          });
          fetchClientOrders();
          setActiveTab('orders');
        } catch (err) {
          setPaymentResult({
            success: false,
            orderId: txnRef,
            message: 'Không thể xác thực kết quả thanh toán: ' + err.message
          });
        }
      };
      
      verifyPayment();
    }
  }, []);

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

          {isLoggedIn && user?.role !== 'Admin' && (
            <>
              <button 
                className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => { setActiveTab('orders'); fetchClientOrders(); }}
              >
                📦 Đơn hàng
              </button>
              <button 
                className={`nav-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                💖 Yêu thích
              </button>
            </>
          )}

          {isLoggedIn && user?.role === 'Admin' && (
            <button 
              className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('admin'); fetchAdminOrders(); setAdminSuccess(''); setAdminError(''); }}
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
        {activeTab === 'favorites' && isLoggedIn && (
          <FavoriteList onAddToCart={addToCart} />
        )}

        {activeTab === 'menu' && (
          <>
            <RecommendationSection isLoggedIn={isLoggedIn} />
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
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, padding: '5px' }}
                        onClick={() => handleAddFavorite(product.ProductID)}
                        title="Thêm vào yêu thích"
                      >
                        ❤️
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, padding: '5px' }}
                        onClick={() => setViewReviewsProduct(product)}
                        title="Xem đánh giá"
                      >
                        💬
                      </button>
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
                      onClick={() => {
                        if (!isLoggedIn) {
                          alert('Vui lòng đăng nhập để tiến hành đặt hàng.');
                          setActiveTab('login');
                        } else {
                          setIsCheckoutOpen(true);
                        }
                      }}
                    >
                      Đặt Hàng Ngay
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </>
        )}

        {/* Tab Admin (CRUD Thực đơn và Kho) */}
        {activeTab === 'admin' && isLoggedIn && user?.role === 'Admin' && (
          <div style={{ width: '100%' }}>
            {/* Sub-tabs */}
            <div className="admin-subtabs glass-panel" style={{ padding: '10px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '15px' }}>
              <button 
                className={`subtab-btn ${adminSubtab === 'products' ? 'active' : ''}`}
                onClick={() => setAdminSubtab('products')}
              >
                🍔 Quản lý Thực đơn & Kho
              </button>
              <button 
                className={`subtab-btn ${adminSubtab === 'orders' ? 'active' : ''}`}
                onClick={() => { setAdminSubtab('orders'); fetchAdminOrders(); }}
              >
                📦 Quản lý Đơn hàng ({adminOrders.length})
              </button>
              <button 
                className={`subtab-btn ${adminSubtab === 'chatbotLogs' ? 'active' : ''}`}
                onClick={() => { setAdminSubtab('chatbotLogs'); fetchChatbotLogs(); }}
              >
                🤖 Nhật ký Chatbot
              </button>
            </div>

            {adminSubtab === 'products' && (
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
            
            {/* Quản lý đơn hàng Admin */}
            {adminSubtab === 'orders' && (
              <div className="glass-panel fade-in" style={{ padding: '20px' }}>
                <div className="list-header" style={{ marginBottom: '20px' }}>
                  <h2>Đơn Hàng Toàn Hệ Thống</h2>
                  <p className="text-muted">Quản lý và duyệt trạng thái đơn hàng của thực khách</p>
                </div>

                <div className="admin-products-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã Đơn</th>
                        <th>Khách Hàng</th>
                        <th>Ngày Đặt</th>
                        <th>Tổng Cộng</th>
                        <th>PT Thanh Toán</th>
                        <th>Trạng Thái</th>
                        <th>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminOrders.map(order => (
                        <tr key={order.OrderID}>
                          <td><strong>#{order.OrderID}</strong></td>
                          <td>
                            <div>{order.FullName}</div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{order.Email}</span>
                          </td>
                          <td>{new Date(order.OrderDate).toLocaleString('vi-VN')}</td>
                          <td className="text-orange">{order.FinalAmount.toLocaleString('vi-VN')} đ</td>
                          <td>{order.PaymentMethod} ({order.PaymentStatus})</td>
                          <td>
                            <span className={`status-pill status-${order.Status}`}>
                              {order.Status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-cell">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => loadOrderDetails(order.OrderID, true)}
                              >
                                👁️ Chi tiết
                              </button>
                              {order.Status === 'Chờ xác nhận' && (
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleUpdateOrderStatus(order.OrderID, 'Đang giao')}
                                >
                                  🚚 Giao đơn
                                </button>
                              )}
                              {order.Status === 'Đang giao' && (
                                <button 
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleUpdateOrderStatus(order.OrderID, 'Hoàn thành')}
                                >
                                  ✓ Xong
                                </button>
                              )}
                              {order.Status !== 'Hoàn thành' && order.Status !== 'Đã hủy' && (
                                <button 
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleUpdateOrderStatus(order.OrderID, 'Đã hủy')}
                                >
                                  ✕ Hủy
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quản lý Nhật ký Chatbot Admin */}
            {adminSubtab === 'chatbotLogs' && (
              <div className="glass-panel fade-in" style={{ padding: '20px' }}>
                <div className="list-header" style={{ marginBottom: '20px' }}>
                  <h2>Lịch Sử Trò Chuyện Trợ Lý AI</h2>
                  <p className="text-muted">Theo dõi nội dung khách hàng giao tiếp với Chatbot</p>
                </div>

                <div className="admin-products-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>Thời Gian</th>
                        <th style={{ width: '200px' }}>Khách Hàng</th>
                        <th>Câu Hỏi (User)</th>
                        <th>Trả Lời (AI)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminChatbotLogs.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>
                            Chưa có dữ liệu hội thoại nào.
                          </td>
                        </tr>
                      ) : (
                        adminChatbotLogs.map(log => (
                          <tr key={log.LogID}>
                            <td>{new Date(log.CreatedAt).toLocaleString('vi-VN')}</td>
                            <td>
                              <strong>{log.FullName}</strong>
                              <div style={{ fontSize: '12px', color: '#888' }}>{log.Email}</div>
                              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Session: {log.SessionID.substring(0, 8)}...</div>
                            </td>
                            <td><div style={{ whiteSpace: 'pre-wrap', color: '#e0f7fa' }}>{log.userMessage}</div></td>
                            <td><div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.5' }}>{log.botResponse}</div></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
        {/* Tab Lịch sử Đơn hàng (Khách hàng) */}
        {activeTab === 'orders' && isLoggedIn && (
          <div className="orders-container fade-in" style={{ width: '100%' }}>
            <div className="list-header" style={{ marginBottom: '20px' }}>
              <h2>Lịch Sử Đơn Hàng Của Bạn</h2>
              <p className="text-muted">Theo dõi hành trình và trạng thái các món ăn bạn đã đặt</p>
            </div>

            {clientOrders.length === 0 ? (
              <div className="glass-panel text-center" style={{ padding: '40px', borderRadius: '16px' }}>
                <span style={{ fontSize: '48px' }}>📦</span>
                <p style={{ marginTop: '15px', color: 'var(--text-muted)' }}>Bạn chưa có đơn hàng nào. Hãy đặt món ngay!</p>
                <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={() => setActiveTab('menu')}>Xem Thực Đơn</button>
              </div>
            ) : (
              <div className="orders-grid">
                {clientOrders.map(order => (
                  <div key={order.OrderID} className="order-card glass-panel" style={{ borderRadius: '16px' }}>
                    <div className="order-header">
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MÃ ĐƠN HÀNG</span>
                        <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>#{order.OrderID}</h4>
                      </div>
                      <span className={`status-pill status-${order.Status}`}>
                        {order.Status}
                      </span>
                    </div>

                    <div className="order-details-grid">
                      <div className="order-detail-item">
                        <label>Ngày đặt</label>
                        <span>{new Date(order.OrderDate).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="order-detail-item">
                        <label>Địa chỉ nhận</label>
                        <span className="text-truncate" style={{ maxWidth: '200px', display: 'block' }}>{order.ShippingAddress}</span>
                      </div>
                      <div className="order-detail-item">
                        <label>Thanh toán</label>
                        <span>{order.PaymentMethod}</span>
                      </div>
                      <div className="order-detail-item">
                        <label>Tổng thanh toán</label>
                        <span className="text-orange">{order.FinalAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => loadOrderDetails(order.OrderID, false)}
                      >
                        👁️ Xem chi tiết
                      </button>
                      {order.Status === 'Chờ xác nhận' && (
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancelOrder(order.OrderID)}
                        >
                          ✕ Hủy đơn
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- PHÂN HỆ 4: CHECKOUT MODAL OVERLAY --- */}
      {isCheckoutOpen && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal glass-panel" style={{ borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>🛒 Xác Nhận Đặt Hàng</h2>
              <button 
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
                onClick={() => setIsCheckoutOpen(false)}
              >
                ×
              </button>
            </div>

            {checkoutError && <div className="alert alert-danger" style={{ marginTop: '15px' }}>{checkoutError}</div>}

            <form onSubmit={handlePlaceOrder} className="checkout-grid">
              {/* Cột Trái: Nhập địa chỉ & Bản đồ số */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 'bold' }}>📍 Địa chỉ giao hàng</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Số nhà, Tên đường, Quận/Huyện..."
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    required
                  />
                </div>

                {/* Leaflet Map */}
                <LeafletMap onLocationSelected={handleLocationSelected} />

                {latitude && longitude && (
                  <div style={{ fontSize: '12px', background: 'rgba(255, 87, 34, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 87, 34, 0.2)' }}>
                    🎯 Đã ghim tọa độ: <strong>{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong>
                    {distance !== null && (
                      <div style={{ marginTop: '4px' }}>
                        🛣️ Khoảng cách: <strong>{distance.toFixed(1)} km</strong> (Thời gian di chuyển dự kiến: {Math.round(duration / 60)} phút)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cột Phải: Voucher, Thanh Toán & Tổng Tiền */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Voucher Section */}
                  <div className="form-group">
                    <label style={{ fontWeight: 'bold' }}>🎟️ Mã Giảm Giá (Voucher)</label>
                    <div className="promo-input-group">
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="Mã VOUCHER (Ví dụ: FIVEFOOD50)"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value)}
                      />
                      <button type="button" className="btn btn-secondary" onClick={handleApplyPromo}>Áp dụng</button>
                    </div>
                    {promoError && <div style={{ color: '#ff5252', fontSize: '13px', marginTop: '5px' }}>⚠️ {promoError}</div>}
                    {promoSuccess && <div className="promo-success">✓ {promoSuccess}</div>}
                  </div>

                  {/* Payment Methods */}
                  <div className="form-group" style={{ marginTop: '15px' }}>
                    <label style={{ fontWeight: 'bold' }}>💳 Phương thức thanh toán</label>
                    <div className="payment-methods">
                      <label className="payment-option">
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="COD" 
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                        />
                        <span>💵 Thanh toán tiền mặt khi nhận hàng (COD)</span>
                      </label>
                      <label className="payment-option">
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="VNPAY" 
                          checked={paymentMethod === 'VNPAY'}
                          onChange={() => setPaymentMethod('VNPAY')}
                        />
                        <span>🏦 Ví điện tử VNPAY (Sandbox)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Summary Table */}
                <div>
                  <div className="checkout-summary">
                    <div className="checkout-summary-row">
                      <span>Tạm tính hàng:</span>
                      <span>{totalPrice.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="checkout-summary-row">
                      <span>Phí giao hàng (OSRM):</span>
                      <span>{shippingFee.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="checkout-summary-row" style={{ color: 'var(--success-color)' }}>
                        <span>Giảm giá Voucher:</span>
                        <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div className="checkout-summary-row total">
                      <span>Tổng cộng thanh toán:</span>
                      <span>{Math.max(0, totalPrice + shippingFee - discountAmount).toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px' }}>
                      🚀 Đặt Hàng Ngay
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '12px' }} onClick={() => setIsCheckoutOpen(false)}>
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CHI TIẾT ĐƠN HÀNG MODAL OVERLAY --- */}
      {selectedOrderDetails && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal glass-panel" style={{ borderRadius: '20px', maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Chi Tiết Hóa Đơn #{selectedOrderDetails.OrderID}</h3>
              <button 
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
                onClick={() => setSelectedOrderDetails(null)}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>👤 <strong>Khách hàng:</strong> {selectedOrderDetails.FullName} ({selectedOrderDetails.Phone})</div>
              <div>📍 <strong>Địa chỉ giao:</strong> {selectedOrderDetails.ShippingAddress}</div>
              <div>📅 <strong>Thời gian đặt:</strong> {new Date(selectedOrderDetails.OrderDate).toLocaleString('vi-VN')}</div>
              <div>💳 <strong>Phương thức thanh toán:</strong> {selectedOrderDetails.PaymentMethod} ({selectedOrderDetails.PaymentStatus})</div>
              <div>📊 <strong>Trạng thái đơn:</strong> <span className={`status-pill status-${selectedOrderDetails.Status}`}>{selectedOrderDetails.Status}</span></div>

              {selectedOrderDetails.Status === 'Đang giao' && selectedOrderDetails.Latitude && selectedOrderDetails.Longitude && (
                <DeliveryTrackingMap 
                  customerLat={selectedOrderDetails.Latitude} 
                  customerLng={selectedOrderDetails.Longitude} 
                  shipperLat={shipperLocation && shipperLocation.orderId === selectedOrderDetails.OrderID ? shipperLocation.lat : null}
                  shipperLng={shipperLocation && shipperLocation.orderId === selectedOrderDetails.OrderID ? shipperLocation.lng : null}
                />
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>📋 Món ăn đã đặt:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrderDetails.items?.map((detail, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{detail.ProductName} <strong>x{detail.Quantity}</strong></span>
                        {selectedOrderDetails.Status === 'Hoàn thành' && user?.role !== 'Admin' && (
                          <button 
                            className="btn btn-sm" 
                            style={{ padding: '2px 8px', fontSize: '11px', marginTop: '5px', alignSelf: 'flex-start', background: '#ff9800', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setReviewProductData({ 
                              product: { ProductID: detail.ProductID, ProductName: detail.ProductName },
                              orderId: selectedOrderDetails.OrderID 
                            })}
                          >
                            ⭐ Đánh giá món này
                          </button>
                        )}
                      </div>
                      <span className="text-orange">{(detail.UnitPrice * detail.Quantity).toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tạm tính:</span>
                  <span>{selectedOrderDetails.TotalAmount?.toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Phí ship (OSRM):</span>
                  <span>{selectedOrderDetails.ShippingFee?.toLocaleString('vi-VN')} đ</span>
                </div>
                {selectedOrderDetails.DiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-color)' }}>
                    <span>Giảm giá Voucher:</span>
                    <span>-{selectedOrderDetails.DiscountAmount?.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: 'var(--primary-color)' }}>
                  <span>Tổng tiền thanh toán:</span>
                  <span>{selectedOrderDetails.FinalAmount?.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedOrderDetails(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP KẾT QUẢ THANH TOÁN VNPAY --- */}
      {paymentResult && (
        <div className="checkout-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="checkout-modal glass-panel" style={{ borderRadius: '20px', maxWidth: '400px', textAlign: 'center', padding: '30px' }}>
            {paymentResult.success ? (
              <div>
                <div style={{ fontSize: '60px', color: '#4caf50', marginBottom: '15px' }}>🎉</div>
                <h3 style={{ marginTop: 0, color: '#4caf50' }}>Thanh Toán Thành Công!</h3>
                <p style={{ fontSize: '14px', margin: '15px 0', opacity: 0.9 }}>
                  Cảm ơn bạn! Đơn hàng <strong>#{paymentResult.orderId}</strong> của bạn đã được thanh toán thành công qua ví điện tử VNPay.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '60px', color: '#f44336', marginBottom: '15px' }}>❌</div>
                <h3 style={{ marginTop: 0, color: '#f44336' }}>Thanh Toán Thất Bại</h3>
                <p style={{ fontSize: '14px', margin: '15px 0', opacity: 0.9 }}>
                  {paymentResult.message || 'Giao dịch thanh toán không thành công hoặc đã bị khách hàng hủy bỏ.'}
                </p>
              </div>
            )}
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '10px', padding: '10px 25px' }} 
              onClick={() => setPaymentResult(null)}
            >
              Xác Nhận
            </button>
          </div>
        </div>
      )}

      {/* --- PHÂN HỆ 8: ĐÁNH GIÁ (REVIEW) MODALS --- */}
      {reviewProductData && (
        <ReviewModal 
          product={reviewProductData.product}
          orderId={reviewProductData.orderId}
          onClose={() => setReviewProductData(null)}
          onSuccess={() => {
            setReviewProductData(null);
            alert('Cảm ơn bạn đã gửi đánh giá!');
          }}
        />
      )}

      {viewReviewsProduct && (
        <ProductReviewsModal 
          product={viewReviewsProduct}
          onClose={() => setViewReviewsProduct(null)}
        />
      )}

      <Chatbot />
    </div>
  );
}

export default App;
