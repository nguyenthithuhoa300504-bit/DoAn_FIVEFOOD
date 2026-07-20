import React, { useState, useEffect, useRef } from 'react';
import { useCart } from './context/CartContext';
import { apiFetch, logUserAction } from './utils/apiFetch';
import L from 'leaflet';
import io from 'socket.io-client';
import Chatbot from './components/AIChatbot/Chatbot';
import RecommendationSection from './components/Recommendations/RecommendationSection';
import FavoriteList from './components/Favorites/FavoriteList';
import ReviewModal from './components/Reviews/ReviewModal';
import ProductReviewsModal from './components/Reviews/ProductReviewsModal';
import NotificationDropdown from './components/Notifications/NotificationDropdown';
import LiveChatModal from './components/LiveChat/LiveChatModal';
import AdminLiveChat from './components/LiveChat/AdminLiveChat';
import ProductDetailOverlay from './components/Product/ProductDetailOverlay';
import './App.css';

// Đọc địa chỉ API Backend từ biến môi trường của Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Tọa độ cửa hàng cố định (Phan Thiết làm trung tâm)
const STORE_COORDS = [10.9333, 108.1000];

// Giới hạn hiển thị của bản đồ (nới rộng một chút để tránh lỗi giật hình của Leaflet)
const VIEW_BOUNDS = [
  [10.2, 107.0], // Tây Nam
  [12.2, 109.2]  // Đông Bắc
];

// Giới hạn khu vực Bình Thuận hợp lệ khi click
const VALID_BOUNDS = [
  [10.5, 107.4], // Tây Nam
  [11.9, 108.9]  // Đông Bắc
];

// Component bản đồ Leaflet tích hợp trực tiếp không qua react-leaflet để tránh conflict React 19
function LeafletMap({ onLocationSelected }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      // Khởi tạo bản đồ tại Phan Thiết, giới hạn Lâm Đồng & Bình Thuận
      mapInstance.current = L.map(mapRef.current, {
        maxBounds: VIEW_BOUNDS,
        maxBoundsViscosity: 0.8,
        minZoom: 8
      }).setView(STORE_COORDS, 13);

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
      }).addTo(mapInstance.current).bindPopup('<b>Cửa hàng FIVEFOOD</b><br/>Tọa độ: Phan Thiết Center').openPopup();

      // Sự kiện click trên bản đồ để chọn tọa độ giao hàng
      mapInstance.current.on('click', (e) => {
        // Cảnh báo nếu cố tình click ra ngoài khu vực giới hạn (vùng xám)
        if (!L.latLngBounds(VALID_BOUNDS).contains(e.latlng)) {
          alert('Vui lòng chọn vị trí giao hàng nằm trong khu vực Bình Thuận.');
          return;
        }

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
      <label style={{ display: 'block', fontSize: '12px', color: '#00a8ff', marginBottom: '5px', fontWeight: 'bold' }}>
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
      mapInstance.current = L.map(mapRef.current, {
        maxBounds: VIEW_BOUNDS,
        maxBoundsViscosity: 0.8,
        minZoom: 8
      }).setView(STORE_COORDS, 13);
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
      <label style={{ display: 'block', fontSize: '14px', color: '#00a8ff', marginBottom: '10px', fontWeight: 'bold' }}>
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
  const [activeTab, setActiveTab] = useState('home'); // home, menu, orders, admin, login, register
  const [searchQuery, setSearchQuery] = useState(''); // Thêm state cho thanh tìm kiếm
  const [selectedCategory, setSelectedCategory] = useState('All'); // Thêm state bộ lọc danh mục
  const [sortBy, setSortBy] = useState('all'); // 'all', 'priceAsc', 'priceDesc', 'newest'
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
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
    imageUrl: '🍔',
    ingredients: ''
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
  const [activePromotions, setActivePromotions] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [checkoutError, setCheckoutError] = useState('');

  // Fetch active promotions khi mở modal thanh toán
  useEffect(() => {
    if (isCheckoutOpen) {
      apiFetch(`${API_BASE_URL}/orders/promotions/active`)
        .then(res => {
          if (Array.isArray(res)) {
            setActivePromotions(res);
          }
        })
        .catch(err => console.error('Error fetching promotions:', err));
    }
  }, [isCheckoutOpen]);
  
  const [clientOrders, setClientOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminChatbotLogs, setAdminChatbotLogs] = useState([]);
  const [adminSubtab, setAdminSubtab] = useState('products'); // products, orders, reviews
  const [adminReviews, setAdminReviews] = useState([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  
  // Product Detail Modal State
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  // States cho Phân hệ 8: Đánh giá & Yêu thích
  const [reviewProductData, setReviewProductData] = useState(null);
  const [viewReviewsProduct, setViewReviewsProduct] = useState(null);

  // States cho Phân hệ 9: Thông báo & Chat Realtime
  // Live chat will now use activeTab === 'contact' instead of a separate state

  // Realtime Delivery Socket State
  const [socket, setSocket] = useState(null);
  const [shipperLocation, setShipperLocation] = useState(null);

  // Hero Banner Slider State
  const [currentBanner, setCurrentBanner] = useState(0);
  const banners = [
    {
      title: "Đập tan cơn đói với món ăn <br/><span class='text-highlight'>Nóng Hổi & Thơm Ngon!</span>",
      subtitle: "Đặt món dễ dàng từ danh mục đa dạng phong phú, áp dụng ngập tràn mã giảm giá và giao tận tay bạn chỉ trong một nốt nhạc.",
      img: <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f35c/512.gif" alt="Món ăn ngon" style={{ filter: 'drop-shadow(0 20px 30px rgba(255,87,34,0.3))' }} />
    },
    {
      title: "Món Mới <br/><span class='text-highlight'>Bùng Nổ</span>",
      subtitle: "Thưởng thức hương vị hoàn toàn mới lạ. Đặt ngay kẻo lỡ!",
      img: <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.gif" alt="Pizza" style={{ filter: 'drop-shadow(0 20px 30px rgba(255,152,0,0.3))' }} />
    },
    {
      title: "Giao Hàng <br/><span class='text-highlight'>Siêu Tốc</span>",
      subtitle: "Nóng hổi vừa thổi vừa ăn, giao ngay đến tận cửa nhà bạn.",
      img: <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f69a/512.gif" alt="Giao hàng" style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.2))' }} />
    }
  ];

  useEffect(() => {
    if (activeTab === 'home') {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 4000); // Tự động chuyển sau 4 giây
      return () => clearInterval(timer);
    }
  }, [activeTab, banners.length]);

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

      newSocket.on('shipperCalling', (data) => {
        alert(`📞 Shipper đang gọi cho bạn (Lần ${data.callCount}/3) để giao đơn hàng #${data.orderId}. Vui lòng nghe máy!`);
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

  const fetchAdminReviews = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/reviews/admin/all`);
      setAdminReviews(data || []);
    } catch (err) {
      console.error('Lỗi khi tải đánh giá admin', err);
      setAdminError('Lỗi khi tải danh sách đánh giá');
    }
  };

  const toggleReviewVisibility = async (reviewId) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/reviews/${reviewId}/toggle-hide`, { method: 'PATCH' });
      setAdminSuccess(res.message);
      fetchAdminReviews();
    } catch (err) {
      console.error(err);
      setAdminError('Lỗi khi thay đổi trạng thái đánh giá');
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

  // Admin mô phỏng Shipper gọi điện thoại
  const handleShipperCall = async (orderId) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/admin/orders/${orderId}/shipper-call`, {
        method: 'POST'
      });
      alert(res.message);
      fetchAdminOrders();
      if (selectedOrderDetails && selectedOrderDetails.OrderID === orderId) {
        loadOrderDetails(orderId, true);
      }
    } catch (err) {
      alert('Lỗi gọi điện: ' + err.message);
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
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${STORE_COORDS[1]},${STORE_COORDS[0]};${lng},${lat}?overview=false`);
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
  const handleApplyPromo = async (codeToApply = promoCodeInput) => {
    setPromoError('');
    setPromoSuccess('');
    const finalCode = codeToApply?.trim();
    if (!finalCode) return;
    try {
      const data = await apiFetch(`${API_BASE_URL}/orders/validate-promo`, {
        method: 'POST',
        body: JSON.stringify({
          code: finalCode.toUpperCase(),
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
      logUserAction('FAVORITE_PRODUCT', productId);
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

  // Theo dõi hành vi VIEW_PRODUCT (debounce 3s)
  useEffect(() => {
    let timer;
    if (selectedProductDetails && isLoggedIn) {
      timer = setTimeout(() => {
        logUserAction('VIEW_PRODUCT', selectedProductDetails.ProductID);
      }, 3000); // Ở lại xem > 3s
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedProductDetails, isLoggedIn]);

  // Theo dõi hành vi SEARCH (debounce 2s)
  useEffect(() => {
    let timer;
    if (searchQuery.trim().length > 0 && isLoggedIn) {
      timer = setTimeout(() => {
        logUserAction('SEARCH', null, searchQuery.trim());
      }, 2000); // Gõ xong dừng lại 2s
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, isLoggedIn]);

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

  const renderProductCard = (product) => {
    const isSuspended = product.IsActive === false || product.Inventory <= 0;
    
    return (
      <div key={product.ProductID} className="product-card new-design">
        <div className="product-card-top" onClick={() => setSelectedProductDetails(product)}>
          <div className="product-img-wrapper">
            <span className="card-badge category-badge">{product.CategoryName}</span>
            {isSuspended && (
              <span className="card-badge status-badge suspended">Tạm ngưng</span>
            )}
            
            {product.ImageURL && product.ImageURL.length < 5 ? (
              <div className="emoji-placeholder">{product.ImageURL}</div>
            ) : (
              <img 
                src={product.ImageURL || 'https://via.placeholder.com/300?text=No+Image'} 
                alt={product.ProductName} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                }}
              />
            )}
          </div>
          <button 
            className="float-btn heart-btn" 
            onClick={(e) => { e.stopPropagation(); handleAddFavorite(product.ProductID); }}
            title="Thêm vào yêu thích"
          >
            ❤️
          </button>
        </div>
        
        <div className="product-info" onClick={() => setSelectedProductDetails(product)}>
          <div className="title-row">
            <h3>{product.ProductName}</h3>
          </div>
          
          <div className="meta-row">
            <button 
              className="rating-badge"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProductDetails(product);
              }}
            >
              ⭐ {product.AverageRating ? parseFloat(product.AverageRating).toFixed(1) : '5.0'} ({product.ReviewCount || 0})
            </button>
            <span className="dot-divider">•</span>
            <span className="sold-count">Đã bán {product.SoldCount || 0}</span>
          </div>
          
          <p className="product-desc">{product.Description || 'Món ăn đặc biệt thơm ngon và kích thích vị giác'}</p>
          
          <div className="price-row">
            <span className="price">{product.Price.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
        
        <div className="product-actions-row">
          <button 
            className="action-btn buy-btn"
            disabled={isSuspended}
            onClick={(e) => {
              e.stopPropagation();
              if (isSuspended) return;
              setSelectedProductDetails(product);
            }}
          >
            Chọn món
          </button>
          <button 
            className="action-btn cart-btn-new"
            disabled={isSuspended}
            onClick={(e) => {
              e.stopPropagation();
              if (isSuspended) return;
              addToCart(product, 1);
              alert(`Đã thêm ${product.ProductName} vào giỏ hàng!`);
            }}
            title="Thêm vào giỏ hàng"
          >
            🛒
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header-bar fade-in" style={{ flexDirection: 'column', padding: '15px 40px 10px 40px', gap: '20px' }}>
        
        {/* Top Row: Logo, Search, Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          
          {/* Logo */}
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
            <div style={{ background: '#ff7043', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(255,112,67,0.3)' }}>
              ⚡
            </div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>
              <span style={{ color: '#111' }}>FIVE</span>
              <span style={{ color: '#ff7043' }}>FOOD</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="header-search-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '30px', padding: '6px 8px 6px 20px', flex: '0 1 500px', border: '1px solid transparent', transition: 'all 0.3s' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Tìm kiếm món ăn ngon ngay..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'menu' && e.target.value.trim() !== '') {
                  setActiveTab('menu');
                }
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', flex: 1, padding: '0 15px', fontSize: '15px' }}
            />
            <button 
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold', cursor: 'pointer', padding: '8px 15px', fontSize: '15px', color: '#111' }}
              onClick={() => setActiveTab('menu')}
            >
              Tìm kiếm
            </button>
          </div>

          {/* Action Icons */}
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              title={isDarkMode ? "Giao diện sáng" : "Giao diện tối"} 
              style={{ width: '42px', height: '42px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.04)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button title="Yêu thích" style={{ width: '42px', height: '42px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.04)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5252', transition: 'all 0.2s' }}
              onClick={() => {
                if(!isLoggedIn) { alert('Vui lòng đăng nhập để xem danh sách yêu thích'); setActiveTab('login'); return; }
                setActiveTab('favorites');
              }}
            >
              ❤️
            </button>
            
            <button title="Giỏ hàng" style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.04)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onClick={() => setActiveTab('cart')}
            >
              🛍️
              {totalItems > 0 && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff7043', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  {totalItems}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '5px' }}>
                <NotificationDropdown socket={socket} />
                <div className="user-avatar" style={{ border: '2px solid #ff7043', width: '42px', height: '42px', cursor: 'pointer', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} title={`Đăng xuất (${user?.fullName})`} onClick={logout}>
                  👤
                </div>
              </div>
            ) : (
              <div className="user-profile" style={{ marginLeft: '5px' }}>
                <div className="user-avatar" style={{ width: '42px', height: '42px', cursor: 'pointer', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} title="Đăng nhập" onClick={() => setActiveTab('login')}>
                  👤
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Navigation Tabs */}
        <div className="header-nav-tabs" style={{ display: 'flex', gap: '30px', width: '100%', justifyContent: 'center' }}>
          <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Trang Chủ</button>
          <button className={`nav-btn ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>Thực đơn</button>
          <button className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => {
            if(!isLoggedIn) { alert('Vui lòng đăng nhập để xem đơn hàng'); setActiveTab('login'); return; }
            setActiveTab('orders'); 
            fetchClientOrders(); 
          }}>Đặt hàng</button>
          <button className={`nav-btn ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => {
            if(!isLoggedIn) { alert('Vui lòng đăng nhập để xem danh sách yêu thích'); setActiveTab('login'); return; }
            setActiveTab('favorites');
          }}>Yêu thích</button>
          <button className={`nav-btn ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => {
            if(!isLoggedIn) { alert('Vui lòng đăng nhập để chat với cửa hàng'); setActiveTab('login'); return; }
            setActiveTab('contact');
          }}>Liên hệ</button>
          {isLoggedIn && user?.role === 'Admin' && (
            <button className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => { setActiveTab('admin'); fetchAdminOrders(); setAdminSuccess(''); setAdminError(''); }}>Quản trị</button>
          )}
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'favorites' && isLoggedIn && (
          <FavoriteList onAddToCart={addToCart} />
        )}

        {activeTab === 'contact' && isLoggedIn && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <LiveChatModal 
              socket={socket} 
              user={user} 
              onClose={() => setActiveTab('home')} 
            />
          </div>
        )}

        {activeTab === 'home' && (
          <>
            <div className="hero-banner glass-panel">
              <div className="hero-content" key={currentBanner} style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: banners[currentBanner].title }}></h1>
                <p className="hero-subtitle" style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '30px', color: 'var(--text-muted)' }}>{banners[currentBanner].subtitle}</p>
                <div className="hero-buttons" style={{ marginBottom: '35px' }}>
                  <button className="btn btn-primary" style={{ padding: '14px 30px', fontSize: '15px', borderRadius: '30px', fontWeight: 'bold' }} onClick={() => setActiveTab('menu')}>
                    🍴 Khám Phá Menu
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '14px 30px', fontSize: '15px', borderRadius: '30px', marginLeft: '15px', fontWeight: 'bold', border: '1px solid var(--primary-color)' }} onClick={() => setActiveTab('menu')}>
                    % Xem Khuyến Mãi
                  </button>
                </div>

                {/* Stats Section */}
                <div style={{ display: 'flex', gap: '30px', borderTop: '1px solid var(--panel-border)', paddingTop: '25px' }}>
                  <div>
                    <div style={{ color: 'var(--primary-color)', fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>500+</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Món ăn ngon</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--primary-color)', fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>10K+</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Khách hàng tin dùng</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--primary-color)', fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>4.9 <span style={{ color: '#FFD700' }}>⭐</span></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Đánh giá chất lượng</div>
                  </div>
                </div>
              </div>
              <div className="hero-shapes">
                <div className="shape-1"></div>
                <div className="shape-2"></div>
                <div className="hero-main-img" key={currentBanner} style={{ animation: 'float 6s ease-in-out infinite, fadeIn 0.5s ease-in-out' }}>
                  {banners[currentBanner].img}
                </div>
              </div>
              
              <div className="banner-indicators" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' }}>
                {banners.map((_, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setCurrentBanner(idx)}
                    style={{ 
                      width: currentBanner === idx ? '24px' : '8px', 
                      height: '8px', 
                      borderRadius: '4px', 
                      background: currentBanner === idx ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* PHẦN GỢI Ý MÓN ĂN DỰA TRÊN HÀNH VI (RECOMMENDATION SYSTEM) */}
            <RecommendationSection isLoggedIn={isLoggedIn} />

            {/* PHẦN MỚI: DANH MỤC NỔI BẬT */}
            <div className="featured-categories-section full-width fade-in">
              <div className="fc-header">
                <h2>Danh mục nổi bật</h2>
                <div className="fc-quick-links">
                </div>
              </div>
              
              <div className="fc-scroll-container">
                <div className="fc-row">
                  {categories.map(cat => {
                    const productCount = products.filter(p => p.CategoryID === cat.CategoryID && (p.IsActive || p.IsActive === undefined)).length;
                    
                    let fallbackEmoji = '🥬';
                    const nameL = cat.CategoryName.toLowerCase();
                    if(nameL.includes('trái cây') || nameL.includes('hoa quả')) fallbackEmoji = '🍎';
                    else if(nameL.includes('thịt')) fallbackEmoji = '🥩';
                    else if(nameL.includes('trứng')) fallbackEmoji = '🥚';
                    else if(nameL.includes('đồ uống') || nameL.includes('nước')) fallbackEmoji = '🥤';
                    else if(nameL.includes('bánh')) fallbackEmoji = '🍔';
                    else if(nameL.includes('hải sản')) fallbackEmoji = '🦐';
                    else if(nameL.includes('salad')) fallbackEmoji = '🥗';

                    return (
                      <div key={cat.CategoryID} className="fc-card" onClick={() => { setSelectedCategory(cat.CategoryName); setActiveTab('menu'); }}>
                        <div className="fc-img-wrapper">
                          {cat.ImageURL ? <img src={cat.ImageURL} alt={cat.CategoryName} className="fc-real-img" /> : <div className="fc-emoji">{fallbackEmoji}</div>}
                        </div>
                        <h4>{cat.CategoryName}</h4>
                        <p>{productCount} sản phẩm</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* PHẦN MỚI: BÁN CHẠY NHẤT HÀNG NGÀY */}
            <div className="daily-best-sellers-section full-width fade-in">
              <div className="dbs-container">
                
                {/* Banner bên trái */}
                <div className="dbs-banner">
                  <h3>Bán chạy nhất<br/>hàng ngày</h3>
                  <p className="dbs-subtitle">Ưu đãi độc quyền - Giảm giá 20%</p>
                  <div className="dbs-promo-text">
                    Mua sắm thoải mái chỉ từ<br/><strong>20.000 VNĐ</strong>
                  </div>
                  <p className="dbs-note">Chỉ trong tuần này. Đừng bỏ lỡ...</p>
                  <button className="dbs-banner-btn" onClick={() => setActiveTab('menu')}>Đặt ngay</button>
                  <div className="dbs-banner-bg-pattern">🍔🍕</div>
                </div>

                {/* Danh sách sản phẩm cuộn ngang */}
                <div className="dbs-products-wrapper">
                  <div className="dbs-products-header">
                  </div>
                  
                  <div className="dbs-scroll-container">
                    {(() => {
                      // Thiết kế lại cấu trúc: Ưu tiên sản phẩm có lượt mua/đánh giá cao.
                      // Để danh sách đổi mới "hàng ngày", kết hợp thêm thuật toán random theo ngày.
                      // Như vậy khi thêm sản phẩm mới, nó không bị đẩy thẳng lên đây gây trùng lặp với Thực Đơn.
                      const todaySeed = new Date().getDate();
                      const bestSellers = [...products]
                        .filter(p => p.IsActive || p.IsActive === undefined)
                        .sort((a, b) => {
                          const scoreA = (a.ReviewCount || 0) * 100 + ((a.ProductID * todaySeed) % 20);
                          const scoreB = (b.ReviewCount || 0) * 100 + ((b.ProductID * todaySeed) % 20);
                          return scoreB - scoreA; // Sắp xếp giảm dần
                        })
                        .slice(0, 8);

                      return bestSellers.map(p => {
                        return (
                          <div key={p.ProductID} className="dbs-product-card" onClick={() => { setSelectedProduct(p); setIsDetailModalOpen(true); }}>
                          {/* Tag Placeholder cho thiết kế (nếu cần sau này có thể logic giảm giá vào đây) */}
                          {p.Price < 30000 && <div className="dbs-discount-tag">Giá tốt</div>}
                          
                          <div className="dbs-img-container">
                            {p.ImageURL ? <img src={p.ImageURL} alt={p.ProductName} className="dbs-real-img" /> : <div className="dbs-emoji">🥑</div>}
                          </div>
                          
                          <div className="dbs-product-info">
                            <h4 className="dbs-product-name">{p.ProductName}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                              <span style={{ color: '#faad14' }}>★ {p.AverageRating ? parseFloat(p.AverageRating).toFixed(1) : '5.0'}</span>
                              <span>({p.ReviewCount || 0} đánh giá)</span>
                            </div>
                            <div className="dbs-price-row">
                              <span className="dbs-new-price">{p.Price.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button className="dbs-add-btn" onClick={(e) => { e.stopPropagation(); setSelectedProductDetails(p); }}>
                                Đặt ngay
                              </button>
                              <button 
                                className="dbs-add-btn" 
                                style={{ width: '40px', padding: '8px 0' }}
                                onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                                title="Thêm vào giỏ"
                              >
                                🛒
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })})()}
                  </div>
                  
                  <div className="dbs-view-all-container">
                    <button className="dbs-view-all-btn" onClick={() => setActiveTab('menu')}>Xem tất cả</button>
                  </div>
                </div>

              </div>
            </div>

            {/* PHẦN: TẠI SAO NÊN ĂN TẠI ĐÂY */}
            <div className="why-eat-here-section full-width fade-in" style={{ paddingTop: '60px', paddingBottom: '40px', textAlign: 'center' }}>
              <div className="section-header" style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '32px', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tại sao nên ăn tại đây</h2>
                <p style={{ color: '#666', marginTop: '15px', maxWidth: '700px', margin: '15px auto 0', lineHeight: '1.6' }}>
                  Hãy đến với chúng tôi và tận hưởng những món ăn tươi ngon, được chế biến từ nguyên liệu chất lượng, mang đến cho bạn trải nghiệm ẩm thực đích thực mà bạn sẽ không thể quên
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                {/* Feature 1 */}
                <div className="feature-card glass-panel" style={{ padding: '40px 20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ marginBottom: '20px' }}>
                    <img src="/ingredients.png" alt="Nguyên liệu tươi sạch" style={{ width: '120px', height: '120px', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))' }} />
                  </div>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px', color: 'var(--text-main)' }}>Nguyên Liệu Tươi Sạch</h3>
                  <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6' }}>
                    Cam kết sử dụng 100% thực phẩm tươi mới mỗi ngày, nguồn gốc rõ ràng, đảm bảo an toàn sức khỏe và mang đến hương vị tự nhiên nhất.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="feature-card glass-panel" style={{ padding: '40px 20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ marginBottom: '20px' }}>
                    <img src="/chef.png" alt="Đầu bếp" style={{ width: '120px', height: '120px', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))' }} />
                  </div>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px', color: 'var(--text-main)' }}>Hương Vị Tuyệt Hảo</h3>
                  <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6' }}>
                    Sự kết hợp hoàn hảo giữa công thức độc quyền và tâm huyết của những đầu bếp chuyên nghiệp, mang đến trải nghiệm ẩm thực khó quên.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="feature-card glass-panel" style={{ padding: '40px 20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ marginBottom: '20px' }}>
                    <img src="/shipper.png" alt="Shipper" style={{ width: '120px', height: '120px', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))' }} />
                  </div>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px', color: 'var(--text-main)' }}>Giao Hàng Siêu Tốc</h3>
                  <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6' }}>
                    Đội ngũ shipper thần tốc đảm bảo món ăn đến tay bạn luôn trong trạng thái nóng hổi, giữ trọn vẹn hương vị như vừa mới ra lò.
                  </p>
                </div>
              </div>
            </div>

            {/* PHẦN MỚI: QUY TRÌNH ĐẶT HÀNG */}
            <div className="order-process-section full-width fade-in">
              <div className="section-header text-center">
                <h2 style={{ fontSize: '32px', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cách Thức Hoạt Động</h2>
                <p style={{ color: '#666', marginTop: '15px' }}>Chỉ với 4 bước đơn giản để thưởng thức món ngon</p>
              </div>
              <div className="process-steps-container">
                <div className="process-step">
                  <div className="step-icon">📱</div>
                  <h4>1. Chọn Món</h4>
                  <p>Khám phá thực đơn đa dạng và chọn món yêu thích</p>
                </div>
                <div className="process-arrow">➔</div>
                <div className="process-step">
                  <div className="step-icon">💳</div>
                  <h4>2. Thanh Toán</h4>
                  <p>Thanh toán an toàn qua COD hoặc VNPAY</p>
                </div>
                <div className="process-arrow">➔</div>
                <div className="process-step">
                  <div className="step-icon">🛵</div>
                  <h4>3. Giao Hàng</h4>
                  <p>Theo dõi shipper giao hàng siêu tốc đến tận nhà</p>
                </div>
                <div className="process-arrow">➔</div>
                <div className="process-step">
                  <div className="step-icon">🍽️</div>
                  <h4>4. Thưởng Thức</h4>
                  <p>Nhận đồ ăn nóng hổi và ngon miệng</p>
                </div>
              </div>
            </div>

            {/* PHẦN MỚI: ĐÁNH GIÁ TỪ KHÁCH HÀNG */}
            <div className="testimonials-section full-width fade-in">
              <div className="section-header text-center">
                <h2 style={{ fontSize: '32px', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>Khách Hàng Nói Gì Về Chúng Tôi</h2>
                <p style={{ color: '#666', marginTop: '15px' }}>Hàng ngàn đánh giá tích cực từ thực khách hài lòng</p>
              </div>
              <div className="testimonials-grid">
                <div className="testimonial-card glass-panel">
                  <div className="quote-icon">❝</div>
                  <p className="testimonial-text">"Đồ ăn giao đến rất nhanh, vẫn còn nóng hổi. Phở bò đặc biệt nước dùng cực kỳ đậm đà. Chắc chắn sẽ quay lại ủng hộ tiếp!"</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">👩</div>
                    <div className="author-info">
                      <h4>Nguyễn Thu Hà</h4>
                      <div className="stars">⭐⭐⭐⭐⭐</div>
                    </div>
                  </div>
                </div>
                <div className="testimonial-card glass-panel">
                  <div className="quote-icon">❝</div>
                  <p className="testimonial-text">"Giao diện dễ sử dụng, đặt hàng nhanh chóng. Mình rất thích tính năng theo dõi shipper trên bản đồ, rất tiện lợi và an tâm!"</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">👨</div>
                    <div className="author-info">
                      <h4>Trần Văn Minh</h4>
                      <div className="stars">⭐⭐⭐⭐⭐</div>
                    </div>
                  </div>
                </div>
                <div className="testimonial-card glass-panel">
                  <div className="quote-icon">❝</div>
                  <p className="testimonial-text">"Pizza hải sản viền phô mai quá đỉnh. Trà sữa cũng rất ngon, vị ngọt vừa phải. Sẽ giới thiệu cho bạn bè cùng thưởng thức."</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">👧</div>
                    <div className="author-info">
                      <h4>Lê Mai Trang</h4>
                      <div className="stars">⭐⭐⭐⭐⭐</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}

        {activeTab === 'menu' && (
          <div id="products-grid" className="products-section full-width fade-in" style={{ paddingTop: '20px' }}>
            <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '32px', color: 'var(--primary-color)' }}>
                {selectedCategory === 'All' ? 'Tất Cả Sản Phẩm Của Chúng Tôi' : `Thực đơn: ${selectedCategory}`}
              </h2>
              <p style={{ color: '#666', marginTop: '10px' }}>Khám phá thực đơn đa dạng và phong phú</p>
            </div>

            {/* Category Filter Bar */}
            <div className="category-filter-bar" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <button 
                style={{ 
                  borderRadius: '25px', padding: '10px 24px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                  background: selectedCategory === 'All' ? 'linear-gradient(135deg, #ff5722 0%, #ff8a65 100%)' : '#fff',
                  color: selectedCategory === 'All' ? '#fff' : '#333',
                  boxShadow: selectedCategory === 'All' ? '0 4px 15px rgba(255, 87, 34, 0.3)' : '0 4px 10px rgba(0,0,0,0.05)'
                }}
                onClick={() => setSelectedCategory('All')}
              >
                Tất Cả Món
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.CategoryID}
                  style={{ 
                    borderRadius: '25px', padding: '10px 24px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                    background: selectedCategory === cat.CategoryName ? 'linear-gradient(135deg, #ff5722 0%, #ff8a65 100%)' : '#fff',
                    color: selectedCategory === cat.CategoryName ? '#fff' : '#333',
                    boxShadow: selectedCategory === cat.CategoryName ? '0 4px 15px rgba(255, 87, 34, 0.3)' : '0 4px 10px rgba(0,0,0,0.05)'
                  }}
                  onClick={() => setSelectedCategory(cat.CategoryName)}
                >
                  {cat.CategoryName}
                </button>
              ))}
            </div>

            {/* Sort Filter Bar (Segmented Control Style) */}
            <div className="sort-filter-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', color: '#555', fontSize: '15px' }}>Sắp xếp:</span>
              <div style={{ display: 'flex', background: '#f1f3f5', padding: '4px', borderRadius: '30px', gap: '2px' }}>
                <button 
                  style={{ 
                    borderRadius: '25px', padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s ease',
                    background: sortBy === 'all' ? '#fff' : 'transparent', 
                    color: sortBy === 'all' ? 'var(--primary-color)' : '#666', 
                    boxShadow: sortBy === 'all' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' 
                  }}
                  onClick={() => setSortBy('all')}
                >
                  ⚡ Tất cả
                </button>
                <button 
                  style={{ 
                    borderRadius: '25px', padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s ease',
                    background: sortBy === 'priceAsc' ? '#fff' : 'transparent', 
                    color: sortBy === 'priceAsc' ? 'var(--primary-color)' : '#666', 
                    boxShadow: sortBy === 'priceAsc' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' 
                  }}
                  onClick={() => setSortBy('priceAsc')}
                >
                  📉 Giá thấp
                </button>
                <button 
                  style={{ 
                    borderRadius: '25px', padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s ease',
                    background: sortBy === 'priceDesc' ? '#fff' : 'transparent', 
                    color: sortBy === 'priceDesc' ? 'var(--primary-color)' : '#666', 
                    boxShadow: sortBy === 'priceDesc' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' 
                  }}
                  onClick={() => setSortBy('priceDesc')}
                >
                  📈 Giá cao
                </button>
                <button 
                  style={{ 
                    borderRadius: '25px', padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s ease',
                    background: sortBy === 'newest' ? '#fff' : 'transparent', 
                    color: sortBy === 'newest' ? 'var(--primary-color)' : '#666', 
                    boxShadow: sortBy === 'newest' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' 
                  }}
                  onClick={() => setSortBy('newest')}
                >
                  ✨ Mới nhất
                </button>
              </div>
            </div>

            <div className="product-cards-container" style={{ gap: '30px' }}>
              {[...products]
                .filter(p => p.IsActive || p.IsActive === undefined)
                .filter(p => p.ProductName.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(p => selectedCategory === 'All' || p.CategoryName === selectedCategory)
                .sort((a, b) => {
                  if (sortBy === 'priceAsc') return a.Price - b.Price;
                  if (sortBy === 'priceDesc') return b.Price - a.Price;
                  if (sortBy === 'newest') return b.ProductID - a.ProductID;
                  return 0; // 'all'
                })
                .map(renderProductCard)}
            </div>
          </div>
        )}

        {/* Tab Giỏ hàng (Cart) thay vì nằm cột bên phải */}
        {activeTab === 'cart' && (
            <div className="cart-section full-width glass-panel fade-in" style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
              <div className="section-header-cart" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px', marginBottom: '15px' }}>
                <div className="cart-title-row">
                  <h2 style={{ color: 'var(--primary-color)', fontSize: '24px' }}>🛒 Giỏ Hàng Của Bạn</h2>
                  <span className="cart-count-badge" style={{ fontSize: '16px', padding: '5px 12px' }}>{totalItems} món</span>
                </div>
                {isLoggedIn ? (
                  <span className="sync-badge db-synced" style={{ marginTop: '10px', display: 'inline-block' }}>⚡ Đã đồng bộ với Database</span>
                ) : (
                  <span className="sync-badge local-stored" style={{ marginTop: '10px', display: 'inline-block' }}>💾 Đang lưu tạm ở LocalStorage</span>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="empty-cart-view" style={{ padding: '50px 20px' }}>
                  <span className="empty-emoji" style={{ fontSize: '60px' }}>🛒</span>
                  <p style={{ fontSize: '18px', marginTop: '15px' }}>Giỏ hàng của bạn đang trống.</p>
                  <button className="btn btn-primary" style={{ marginTop: '15px' }} onClick={() => setActiveTab('menu')}>Quay lại Trang Chủ để chọn món</button>
                </div>
              ) : (
                <div className="cart-items-list" style={{ gap: '15px' }}>
                  {cart.map((item) => (
                    <div key={item.ProductID} className="cart-item glass-panel" style={{ padding: '15px', display: 'flex', alignItems: 'center' }}>
                      <div className="cart-item-info" style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '18px', margin: '0 0 5px 0' }}>{item.ProductName}</h4>
                        <p className="cart-item-price" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{item.Price.toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div className="cart-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="quantity-controls" style={{ background: 'var(--panel-bg)', borderRadius: '20px', padding: '5px' }}>
                          <button 
                            className="qty-btn"
                            onClick={() => addToCart(item, -1)}
                          >
                            -
                          </button>
                          <span className="qty-val" style={{ margin: '0 15px', fontWeight: 'bold' }}>{item.Quantity}</span>
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
                          title="Xóa khỏi giỏ hàng"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="cart-summary glass-panel" style={{ marginTop: '20px', padding: '20px', background: 'rgba(0, 168, 255, 0.05)', border: '1px solid var(--primary-color)' }}>
                    <div className="summary-row" style={{ fontSize: '20px', marginBottom: '15px' }}>
                      <span style={{ fontWeight: 'bold' }}>Tổng tiền thanh toán:</span>
                      <span className="total-amount" style={{ color: 'var(--primary-color)', fontSize: '24px' }}>{totalPrice.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button 
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '15px', fontSize: '16px' }}
                        onClick={() => setActiveTab('menu')}
                      >
                        Tiếp tục mua hàng
                      </button>
                      <button 
                        className="btn btn-primary btn-checkout"
                        style={{ flex: 2, padding: '15px', fontSize: '18px' }}
                        onClick={() => {
                          if (!isLoggedIn) {
                            alert('Vui lòng đăng nhập để tiến hành đặt hàng.');
                            setActiveTab('login');
                          } else {
                            setIsCheckoutOpen(true);
                          }
                        }}
                      >
                        Thanh Toán Ngay 💳
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              <button 
                className={`subtab-btn ${adminSubtab === 'liveChat' ? 'active' : ''}`}
                onClick={() => setAdminSubtab('liveChat')}
              >
                💬 Hỗ trợ trực tuyến
              </button>
              <button 
                className={`subtab-btn ${adminSubtab === 'reviews' ? 'active' : ''}`}
                onClick={() => { setAdminSubtab('reviews'); fetchAdminReviews(); }}
              >
                ⭐ Quản lý Đánh Giá
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

                      <div className="form-group">
                        <label>Nguyên liệu làm món ăn</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={productForm.ingredients || ''}
                          onChange={(e) => setProductForm({...productForm, ingredients: e.target.value})}
                          placeholder="Ví dụ: Bánh phở, thịt bò nạc, hành lá..." 
                        />
                      </div>

                      <div className="btn-group-admin">
                        <button type="submit" className="btn btn-primary">{productForm.id ? 'Cập Nhật' : 'Thêm Mới'}</button>
                        {productForm.id && (
                          <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={() => setProductForm({ id: null, productName: '', categoryId: '', price: '', inventory: '', imageUrl: '🍔', ingredients: '' })}
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
                                    imageUrl: prod.ImageURL || '🍔',
                                    ingredients: prod.Ingredients || ''
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
                                <>
                                  <button 
                                    className="btn btn-warning btn-sm"
                                    onClick={() => handleShipperCall(order.OrderID)}
                                    style={{ marginLeft: '5px', marginRight: '5px' }}
                                  >
                                    📞 Gọi ({order.CallCount || 0}/3)
                                  </button>
                                  <button 
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleUpdateOrderStatus(order.OrderID, 'Hoàn thành')}
                                  >
                                    ✓ Xong
                                  </button>
                                </>
                              )}
                              {order.Status !== 'Hoàn thành' && order.Status !== 'Đã hủy' && order.Status !== 'Trả hàng' && (
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

            {/* Quản lý Chat Realtime */}
            {adminSubtab === 'liveChat' && (
              <div style={{ marginTop: '20px' }}>
                <AdminLiveChat socket={socket} user={user} />
              </div>
            )}

            {/* Quản lý Đánh Giá Admin */}
            {adminSubtab === 'reviews' && (
              <div className="admin-section fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#00e5ff', margin: 0 }}>Quản lý Đánh Giá & Bình Luận</h3>
                  <button className="btn btn-secondary" onClick={fetchAdminReviews}>Làm mới</button>
                </div>
                
                <div className="admin-products-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Ngày</th>
                        <th style={{ width: '150px' }}>Khách Hàng</th>
                        <th style={{ width: '180px' }}>Món Ăn</th>
                        <th style={{ width: '100px' }}>Đánh Giá</th>
                        <th>Bình Luận</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminReviews.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                            Chưa có đánh giá nào.
                          </td>
                        </tr>
                      ) : (
                        adminReviews.map(review => (
                          <tr key={review.ReviewID} style={{ opacity: review.IsHidden ? 0.6 : 1, background: review.IsHidden ? 'rgba(255,0,0,0.05)' : 'transparent' }}>
                            <td>{new Date(review.CreatedAt).toLocaleDateString('vi-VN')}</td>
                            <td><strong>{review.FullName}</strong></td>
                            <td><span style={{ color: '#00e5ff', fontWeight: 'bold' }}>{review.ProductName}</span></td>
                            <td>
                              <div style={{ color: '#f59e0b', fontSize: '16px' }}>
                                {'★'.repeat(review.Rating)}{'☆'.repeat(5 - review.Rating)}
                              </div>
                            </td>
                            <td>
                              <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', wordBreak: 'break-word', color: review.IsHidden ? '#999' : 'inherit', textDecoration: review.IsHidden ? 'line-through' : 'none' }}>
                                {review.Comment || <span style={{ fontStyle: 'italic', color: '#888' }}>Không có bình luận</span>}
                              </div>
                              {review.IsHidden && <div style={{ fontSize: '12px', color: '#ff4d4f', marginTop: '4px', fontWeight: 'bold' }}>(Đã bị ẩn khỏi trang sản phẩm)</div>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className={`btn ${review.IsHidden ? 'btn-primary' : 'btn-danger'}`}
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                onClick={() => toggleReviewVisibility(review.ReviewID)}
                              >
                                {review.IsHidden ? 'Hiển thị' : 'Ẩn'}
                              </button>
                            </td>
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
                    <div className="promo-list">
                      {activePromotions.map(promo => {
                        const potentialDiscount = Math.min((totalPrice * promo.DiscountPercentage) / 100, promo.MaxDiscountAmount);
                        const isExpensive = totalPrice >= 150000;
                        const isEligible = totalPrice >= promo.MinOrderValue;
                        
                        return (
                          <label 
                            key={promo.PromotionID} 
                            className={`promo-card ${promoCodeInput === promo.PromoCode ? 'selected' : ''} ${!isEligible ? 'disabled' : ''}`}
                          >
                            <input 
                              type="radio" 
                              name="promo" 
                              value={promo.PromoCode}
                              checked={promoCodeInput === promo.PromoCode}
                              onChange={() => {
                                if (isEligible) {
                                  setPromoCodeInput(promo.PromoCode);
                                  handleApplyPromo(promo.PromoCode);
                                }
                              }}
                              disabled={!isEligible}
                            />
                            <div className="promo-card-content">
                              <div className="promo-card-header">
                                <span className="promo-code-badge">{promo.PromoCode}</span>
                                {isEligible ? (
                                  <span className="promo-discount-text">
                                    {isExpensive 
                                      ? `Giảm ngay ${potentialDiscount.toLocaleString('vi-VN')}đ` 
                                      : `Giảm ${promo.DiscountPercentage}% (Tối đa ${promo.MaxDiscountAmount.toLocaleString('vi-VN')}đ)`}
                                  </span>
                                ) : (
                                  <span className="promo-discount-text" style={{ color: '#aaa', fontSize: '12px' }}>
                                    Đơn tối thiểu {promo.MinOrderValue.toLocaleString('vi-VN')}đ
                                  </span>
                                )}
                              </div>
                              {promo.Description && <div className="promo-desc">{promo.Description}</div>}
                            </div>
                          </label>
                        );
                      })}
                      {activePromotions.length === 0 && <div style={{ fontSize: '13px', color: '#666', padding: '10px 0' }}>Không có mã giảm giá khả dụng.</div>}
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => handleApplyPromo()} style={{ marginTop: '10px', width: '100%' }}>Áp dụng Khuyến mãi</button>
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

      {/* Old ProductReviewsModal removed to use unified ProductDetailOverlay */}

      {/* --- PHÂN HỆ: PRODUCT DETAIL MODAL --- */}
      {selectedProductDetails && (
        <ProductDetailOverlay 
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
          addToCart={addToCart}
          isLoggedIn={isLoggedIn}
          setActiveTab={setActiveTab}
          setIsCheckoutOpen={setIsCheckoutOpen}
        />
      )}



      {/* Floating Hotline */}
      <div className="floating-hotline">
        <a href="tel:19001234" className="hotline-btn">
          📞
        </a>
        <span className="hotline-text">Gọi ngay 1900 1234</span>
      </div>

      {/* GLOBAL FOOTER */}
      <footer className="global-footer full-width">
        <div className="footer-container">
          <div className="footer-col brand-col">
            <h2 className="footer-logo"><span style={{ color: '#fff' }}>FIVE</span><span style={{ color: '#ff7043' }}>FOOD</span></h2>
            <p>Hệ thống giao đồ ăn nhanh chóng, tiện lợi với hàng ngàn món ngon đang chờ bạn khám phá. Đặt món ngay để trải nghiệm!</p>
            <div className="social-links">
              <a href="#" className="social-icon">🌐</a>
              <a href="#" className="social-icon">📱</a>
              <a href="#" className="social-icon">✉️</a>
            </div>
          </div>
          <div className="footer-col">
            <h3>Liên Kết Nhanh</h3>
            <ul>
              <li onClick={() => setActiveTab('home')}>Trang Chủ</li>
              <li onClick={() => setActiveTab('menu')}>Thực Đơn</li>
              <li onClick={() => {
                if(!isLoggedIn) { alert('Vui lòng đăng nhập'); setActiveTab('login'); } else setActiveTab('orders');
              }}>Đơn Hàng</li>
              <li onClick={() => {
                if(!isLoggedIn) { alert('Vui lòng đăng nhập'); setActiveTab('login'); } else setActiveTab('favorites');
              }}>Yêu Thích</li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Hỗ Trợ Khách Hàng</h3>
            <ul>
              <li>Trung tâm trợ giúp</li>
              <li>Hướng dẫn đặt hàng</li>
              <li>Chính sách bảo mật</li>
              <li>Điều khoản dịch vụ</li>
            </ul>
          </div>
          <div className="footer-col contact-col">
            <h3>Thông Tin Liên Hệ</h3>
            <p>📍 123 Đường Ẩm Thực, Cầu Giấy, Hà Nội</p>
            <p>📞 Hotline: 1900 1234</p>
            <p>✉️ Email: support@fivefood.vn</p>
            <p>⏰ Giờ mở cửa: 08:00 - 22:00 hàng ngày</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} FIVEFOOD. Tất cả các quyền được bảo lưu.</p>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
}

export default App;
