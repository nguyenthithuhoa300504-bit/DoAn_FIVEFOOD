import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
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
import AdminDashboard from './components/Admin/AdminDashboard';
import './App.css';
import { renderToString } from 'react-dom/server';
import { Store, MapPin } from 'lucide-react';

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
          html: renderToString(<Store color="#FF7A00" size={30} strokeWidth={2.5} />),
          className: 'store-emoji-icon',
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance.current).bindPopup('<b>Cửa hàng FIVEFOOD</b><br/>Tọa độ: Phan Thiết Center').openPopup();

      // Sự kiện click trên bản đồ để chọn tọa độ giao hàng
      mapInstance.current.on('click', (e) => {
        // Cảnh báo nếu cố tình click ra ngoài khu vực giới hạn (vùng xám)
        if (!L.latLngBounds(VALID_BOUNDS).contains(e.latlng)) {
          toast('Vui lòng chọn vị trí giao hàng nằm trong khu vực Bình Thuận.');
          return;
        }

        const { lat, lng } = e.latlng;
        
        if (markerInstance.current) {
          markerInstance.current.setLatLng(e.latlng);
        } else {
          markerInstance.current = L.marker(e.latlng, {
            icon: L.divIcon({
              html: renderToString(<MapPin color="#f44336" size={30} strokeWidth={2.5} />),
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
        className="leaflet-map-container" 
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
          html: renderToString(<Store color="#FF7A00" size={30} strokeWidth={2.5} />),
          className: 'store-emoji-icon',
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance.current).bindPopup('FIVEFOOD').openPopup();

      // Điểm Khách hàng
      L.marker([customerLat, customerLng], {
        icon: L.divIcon({
          html: renderToString(<MapPin color="#f44336" size={30} strokeWidth={2.5} />),
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

export const getDiscountForPrice = (price) => {
  if (price >= 100000) return 25;
  if (price >= 60000) return 20;
  if (price >= 30000) return 15;
  return 10;
};

export const getMockProductData = (id) => {
  const numId = typeof id === 'number' ? id : parseInt(id) || 0;
  // Rating between 4.2 and 4.9
  const rating = (4.2 + (numId % 8) * 0.1).toFixed(1);
  // Reviews between 15 and 214
  const reviews = (numId * 7 % 200) + 15;
  // Sold count
  const rawSold = (numId * 13 % 1500) + 10;
  const sold = rawSold >= 1000 ? (rawSold / 1000).toFixed(1) + 'k' : rawSold.toString();
  return { rating, reviews, sold };
};
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);
  
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
  const [categoryForm, setCategoryForm] = useState({ categoryName: '', description: '', imageUrl: '' });
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
  const [adminUsersCount, setAdminUsersCount] = useState(0);
  const [adminChatbotLogs, setAdminChatbotLogs] = useState([]);
  const [adminSubtab, setAdminSubtab] = useState('dashboard'); // dashboard, products, orders, reviews
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
      img: <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f35c/512.webp" alt="Món ăn ngon" className="banner-img-food" />
    },
    {
      title: "Món Mới <br/><span class='text-highlight'>Bùng Nổ</span>",
      subtitle: "Thưởng thức hương vị hoàn toàn mới lạ. Đặt ngay kẻo lỡ!",
      img: <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.webp" alt="Pizza" className="banner-img-pizza" />
    },
    {
      title: "Giao Hàng <br/><span class='text-highlight'>Siêu Tốc</span>",
      subtitle: "Nóng hổi vừa thổi vừa ăn, giao ngay đến tận cửa nhà bạn.",
      img: <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f69a/512.webp" alt="Giao hàng" className="banner-img-truck" />
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
        toast(`🎉 Đơn hàng #${data.orderId} của bạn đã được giao thành công!`);
      });

      newSocket.on('shipperCalling', (data) => {
        if (data.callCount > 3) {
          toast.error(`⚠️ CẢNH BÁO: Shipper đã gọi cho bạn ${data.callCount} lần để giao đơn hàng #${data.orderId}. Vui lòng nghe máy ngay nếu không đơn hàng sẽ bị xử lý!`, { duration: 6000 });
        } else {
          toast(`📞 Shipper đang gọi cho bạn (Lần ${data.callCount}/3) để giao đơn hàng #${data.orderId}. Vui lòng nghe máy!`);
        }
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

  const fetchAdminUsersCount = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/admin/users?limit=1`);
      if (data && data.pagination) {
        setAdminUsersCount(data.pagination.totalItems);
      }
    } catch (err) {
      console.error('Lỗi khi lấy số lượng users:', err);
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
      toast('Lỗi tải chi tiết đơn hàng: ' + err.message);
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
      toast('Lỗi cập nhật trạng thái: ' + err.message);
    }
  };

  // Admin mô phỏng Shipper gọi điện thoại
  const handleShipperCall = async (orderId) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/admin/orders/${orderId}/shipper-call`, {
        method: 'POST'
      });
      toast(res.message);
      fetchAdminOrders();
      if (selectedOrderDetails && selectedOrderDetails.OrderID === orderId) {
        loadOrderDetails(orderId, true);
      }
    } catch (err) {
      toast('Lỗi gọi điện: ' + err.message);
    }
  };

  // Khách hàng tự hủy đơn hàng (trạng thái Chờ xác nhận)
  const handleCancelOrder = async (orderId) => {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
        method: 'PUT'
      });
      toast('Đã hủy đơn hàng thành công.');
      fetchClientOrders();
      if (selectedOrderDetails && selectedOrderDetails.OrderID === orderId) {
        setSelectedOrderDetails(null); // Đóng modal chi tiết
      }
    } catch (err) {
      toast('Hủy đơn hàng thất bại: ' + err.message);
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

      toast(`Đặt hàng thành công! Mã hóa đơn: #${result.OrderID}`);
      
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
      toast('Vui lòng đăng nhập để lưu món yêu thích.');
      setActiveTab('login');
      return;
    }
    try {
      await apiFetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        body: JSON.stringify({ productId })
      });
      logUserAction('FAVORITE_PRODUCT', productId);
      toast('💖 Đã thêm vào danh sách yêu thích!');
    } catch (err) {
      toast(err.message || 'Sản phẩm đã có trong danh sách yêu thích!');
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
      setCategoryForm({ categoryName: '', description: '', imageUrl: '' });
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
      toast('Lỗi khi tải lịch sử: ' + err.message);
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
    const mockData = getMockProductData(product.ProductID);
    const displayRating = product.AverageRating ? parseFloat(product.AverageRating).toFixed(1) : mockData.rating;
    const displayReviews = product.ReviewCount || mockData.reviews;
    const displaySold = product.SoldCount || mockData.sold;
    const discountPercent = product.Discount || getDiscountForPrice(product.Price);
    const originalPrice = product.OriginalPrice || Math.round(product.Price / (1 - discountPercent / 100));
    
    return (
      <div key={product.ProductID} className="product-card new-design">
        <div className="product-card-top" onClick={() => setSelectedProductDetails(product)}>
          <div className="product-img-wrapper">
            <span className="card-badge category-badge">{product.CategoryName}</span>
            {!isSuspended && (
              <span className="card-badge discount-badge" style={{ background: '#ff3d00', color: 'white', position: 'absolute', top: '10px', right: '10px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>-{discountPercent}%</span>
            )}
            {isSuspended && (
              <span className="card-badge status-badge suspended">Tạm ngưng</span>
            )}
            
            {!product.ImageURL || product.ImageURL === '??' || product.ImageURL.length < 5 ? (
              <div className="emoji-placeholder" style={{ fontSize: '60px', width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '15px' }}>
                {product.ImageURL && product.ImageURL !== '??' ? product.ImageURL : '🥑'}
              </div>
            ) : (
              <img 
                src={product.ImageURL} 
                alt={product.ProductName} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.outerHTML = '<div style="font-size: 60px; width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.03); border-radius: 15px;">🥑</div>';
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
              ⭐ {displayRating} ({displayReviews} đánh giá)
            </button>
            <span className="dot-divider">•</span>
            <span className="sold-count">Đã bán {displaySold}</span>
          </div>
          
          <p className="product-desc">{product.Description || 'Món ăn đặc biệt thơm ngon và kích thích vị giác'}</p>
          
          <div className="price-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="original-price" style={{ textDecoration: 'line-through', color: '#999', fontSize: '14px' }}>
                {originalPrice.toLocaleString('vi-VN')} đ
              </span>
              <span className="price" style={{ color: '#ff3d00' }}>{product.Price.toLocaleString('vi-VN')} đ</span>
            </div>
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
              toast(`Đã thêm ${product.ProductName} vào giỏ hàng!`);
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
      <Toaster position="bottom-right" />
      {/* Header */}
      <header className="header-bar fade-in">
        
        {/* Top Row: Logo, Search, Actions */}
        <div className="header-top">
          
          {/* Logo */}
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
            <div className="logo-icon">
              ⚡
            </div>
            <h1>
              <span className="logo-text-dark">FIVE</span>
              <span className="logo-text-primary">FOOD</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="header-search-bar">
            <span className="search-icon">🔍</span>
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
              className="search-input"
            />
            <button 
              className="search-btn"
              onClick={() => setActiveTab('menu')}
            >
              Tìm kiếm
            </button>
          </div>

          {/* Action Icons */}
          <div className="header-actions">
            <button 
              className="action-btn"
              title={isDarkMode ? "Giao diện sáng" : "Giao diện tối"} 
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button 
              className="action-btn text-red" 
              title="Yêu thích" 
              onClick={() => {
                if(!isLoggedIn) { toast('Vui lòng đăng nhập để xem danh sách yêu thích'); setActiveTab('login'); return; }
                setActiveTab('favorites');
              }}
            >
              ❤️
            </button>
            
            <button 
              className="action-btn cart-btn" 
              title="Giỏ hàng" 
              onClick={() => setActiveTab('cart')}
            >
              🛍️
              {totalItems > 0 && (
                <span className="cart-badge">
                  {totalItems}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <div className="user-profile">
                <NotificationDropdown socket={socket} />
                <div className="user-avatar logged-in" title={`Đăng xuất (${user?.fullName})`} onClick={logout}>
                  👤
                </div>
              </div>
            ) : (
              <div className="user-profile">
                <div className="user-avatar" title="Đăng nhập" onClick={() => setActiveTab('login')}>
                  👤
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Navigation Tabs */}
        <div className="header-nav-tabs">
          <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Trang Chủ</button>
          <button className={`nav-btn ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>Thực đơn</button>
          <button className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => {
            if(!isLoggedIn) { toast('Vui lòng đăng nhập để xem đơn hàng'); setActiveTab('login'); return; }
            setActiveTab('orders'); 
            fetchClientOrders(); 
          }}>Đặt hàng</button>
          <button className={`nav-btn ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => {
            if(!isLoggedIn) { toast('Vui lòng đăng nhập để xem danh sách yêu thích'); setActiveTab('login'); return; }
            setActiveTab('favorites');
          }}>Yêu thích</button>
          <button className={`nav-btn ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => {
            if(!isLoggedIn) { toast('Vui lòng đăng nhập để chat với cửa hàng'); setActiveTab('login'); return; }
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
              <div className="hero-content" key={currentBanner} style={{ animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: banners[currentBanner].title }}></h1>
                <p className="hero-subtitle" style={{ fontSize: '15px', lineHeight: '1.5', marginBottom: '20px', color: 'var(--text-muted)' }}>{banners[currentBanner].subtitle}</p>
                <div className="hero-buttons" style={{ marginBottom: '25px' }}>
                  <button className="btn btn-primary" style={{ padding: '12px 25px', fontSize: '14px', borderRadius: '30px', fontWeight: 'bold' }} onClick={() => setActiveTab('menu')}>
                    🍴 Khám Phá Menu
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '12px 25px', fontSize: '14px', borderRadius: '30px', marginLeft: '12px', fontWeight: 'bold', border: '1px solid var(--primary-color)' }} onClick={() => setActiveTab('menu')}>
                    % Xem Khuyến Mãi
                  </button>
                </div>

                {/* Stats Section */}
                <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--panel-border)', paddingTop: '15px' }}>
                  <div>
                    <div style={{ color: 'var(--primary-color)', fontSize: '24px', fontWeight: '900', marginBottom: '2px' }}>500+</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>Món ăn ngon</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--primary-color)', fontSize: '24px', fontWeight: '900', marginBottom: '2px' }}>10K+</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>Khách hàng tin dùng</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--primary-color)', fontSize: '24px', fontWeight: '900', marginBottom: '2px' }}>4.9 <span style={{ color: '#FFD700' }}>⭐</span></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>Đánh giá chất lượng</div>
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
                      transition: 'transform 0.3s ease, opacity 0.3s ease'
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
                    else if(nameL.includes('bún') || nameL.includes('phở') || nameL.includes('mì')) fallbackEmoji = '🍜';
                    else if(nameL.includes('pizza')) fallbackEmoji = '🍕';

                    return (
                      <div key={cat.CategoryID} className="fc-card" onClick={() => { setSelectedCategory(cat.CategoryName); setActiveTab('menu'); }}>
                        <div className="fc-img-wrapper">
                          {cat.ImageURL && (cat.ImageURL.includes('/') || cat.ImageURL.includes('http') || cat.ImageURL.length > 5) ? (
                            <img src={cat.ImageURL} alt={cat.CategoryName} className="fc-real-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div className="fc-emoji" style={{ fontSize: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>{cat.ImageURL || fallbackEmoji}</div>
                          )}
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
                      const todaySeed = new Date().getDate();
                      const bestSellers = [...products]
                        .filter(p => p.IsActive || p.IsActive === undefined)
                        .sort((a, b) => {
                          const scoreA = (a.ReviewCount || 0) * 100 + ((a.ProductID * todaySeed) % 20);
                          const scoreB = (b.ReviewCount || 0) * 100 + ((b.ProductID * todaySeed) % 20);
                          return scoreB - scoreA;
                        })
                        .slice(0, 8);

                      return bestSellers.map(p => {
                        const mockData = getMockProductData(p.ProductID);
                        const displayRating = p.AverageRating ? parseFloat(p.AverageRating).toFixed(1) : mockData.rating;
                        const displayReviews = p.ReviewCount || mockData.reviews;
                        const discountPercent = p.Discount || getDiscountForPrice(p.Price);
                        const originalPrice = p.OriginalPrice || Math.round(p.Price / (1 - discountPercent / 100));
                        
                        return (
                          <div key={p.ProductID} className="dbs-product-card" onClick={() => { setSelectedProduct(p); setIsDetailModalOpen(true); }}>
                          <div className="dbs-discount-tag" style={{ background: '#ff3d00', color: '#fff', fontWeight: 'bold' }}>-{discountPercent}%</div>
                          
                          <div className="dbs-img-container">
                            {p.ImageURL && (p.ImageURL.startsWith('http') || p.ImageURL.startsWith('/')) ? (
                              <img src={p.ImageURL} alt={p.ProductName} className="dbs-real-img" />
                            ) : (
                              <div className="dbs-emoji" style={{ fontSize: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>{p.ImageURL || '🥑'}</div>
                            )}
                          </div>
                          
                          <div className="dbs-product-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <h4 className="dbs-product-name">{p.ProductName}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                              <span style={{ color: '#faad14' }}>⭐ {displayRating}</span>
                              <span>({displayReviews} đánh giá)</span>
                            </div>
                            <div className="dbs-price-row">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span className="dbs-old-price" style={{ textDecoration: 'line-through', color: '#999', fontSize: '13px' }}>
                                  {originalPrice.toLocaleString('vi-VN')}đ
                                </span>
                                <span className="dbs-new-price" style={{ color: '#ff3d00' }}>{p.Price.toLocaleString('vi-VN')}đ</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px', marginTop: 'auto' }}>
                              <button className="dbs-add-btn" onClick={(e) => { e.stopPropagation(); setSelectedProductDetails(p); }}>
                                Đặt ngay
                              </button>
                              <button 
                                className="dbs-add-btn" 
                                style={{ width: '40px', padding: '8px 0' }}
                                onClick={(e) => { e.stopPropagation(); addToCart(p, 1); }}
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

            {/* PHẦN 1: TRẢI NGHIỆM ẨM THỰC (Parallax Storytelling) */}
            <div className="premium-parallax-section">
              <div className="parallax-content">
                <h2>Trải Nghiệm Ẩm Thực Đỉnh Cao</h2>
                <p>Khám phá sự kết hợp tinh tế giữa nguyên liệu tươi ngon nhất và nghệ thuật chế biến bậc thầy. Mỗi món ăn là một câu chuyện, mỗi hương vị là một kiệt tác.</p>
                <div className="parallax-stats">
                  <div className="stat-item">
                    <span className="stat-number">10K+</span>
                    <span className="stat-label">Khách hàng hài lòng</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">100%</span>
                    <span className="stat-label">Nguyên liệu tươi</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">50+</span>
                    <span className="stat-label">Món ăn đa dạng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PHẦN 2: MÓN NGON ĐẶC TRƯNG (Signature Dish Split-screen) */}
            <div className="signature-dish-section">
              <div className="signature-container">
                <div className="signature-content">
                  <span className="signature-badge">⭐ Món Ngon Nổi Bật</span>
                  <h2>Phở Bò Thố Đá<br/>Đặc Biệt</h2>
                  <p>Hương vị truyền thống được nâng tầm. Nước dùng hầm từ xương bò nguyên chất trong 24 giờ, hòa quyện cùng các loại thảo mộc cung đình, phục vụ sôi sùng sục trong thố đá núi lửa giữ nhiệt hoàn hảo.</p>
                  <button className="signature-btn" onClick={() => setActiveTab('menu')}>Khám phá ngay</button>
                </div>
                <div className="signature-image-wrapper">
                  <div className="signature-glow"></div>
                  <div style={{ fontSize: '250px', textAlign: 'center', position: 'relative', zIndex: 2, animation: 'float 6s ease-in-out infinite', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))' }}>🍜</div>
                </div>
              </div>
            </div>

            {/* PHẦN 2.5: LINH HỒN THƯƠNG HIỆU (Brand Story) */}
            <div className="brand-story-section fade-in">
              <div className="story-bg-video"></div>
              <div className="story-content">
                <h2 className="story-title">Tâm Huyết Trong Từng Món Ăn</h2>
                <p className="story-text">
                  "Chúng tôi tin rằng, một món ăn ngon không chỉ làm no bụng mà còn phải chạm đến cảm xúc. 
                  Đó là lý do mỗi bát phở, mỗi chiếc bánh tại FIVEFOOD đều được chăm chút từ khâu chọn lựa nguyên liệu khắt khe nhất, 
                  cho đến ngọn lửa rực hồng nêm nếm gia vị của những người thợ lành nghề."
                </p>
                <div className="chef-signature">Master Chef - FIVEFOOD</div>
              </div>
            </div>

            {/* PHẦN 3: GIÁ TRỊ CỐT LÕI (Modern Glassmorphism) */}
            <div className="glass-features-section">
              <div className="section-header text-center" style={{ marginBottom: '50px', position: 'relative', zIndex: 1 }}>
                <h2 style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '15px' }}>Tinh Hoa Hội Tụ</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>Chúng tôi không chỉ phục vụ thức ăn, chúng tôi mang đến cho bạn trải nghiệm và giá trị đích thực.</p>
              </div>
              <div className="features-grid">
                <div className="glass-card">
                  <div className="glass-icon">🥬</div>
                  <h3>Nguyên Liệu Tuyển Chọn</h3>
                  <p>100% thực phẩm tươi sống nhập mới mỗi sáng từ các nông trại hữu cơ đạt chuẩn quốc tế.</p>
                </div>
                <div className="glass-card">
                  <div className="glass-icon">👨‍🍳</div>
                  <h3>Đầu Bếp Trứ Danh</h3>
                  <p>Đội ngũ đầu bếp hơn 10 năm kinh nghiệm tại các nhà hàng 5 sao, chế biến với cả trái tim.</p>
                </div>
                <div className="glass-card">
                  <div className="glass-icon">🚀</div>
                  <h3>Giao Hàng Thần Tốc</h3>
                  <p>Công nghệ điều phối thông minh giúp đồ ăn đến tay bạn luôn nóng hổi chỉ trong 20 phút.</p>
                </div>
              </div>
            </div>

            {/* PHẦN 4: TẢI ỨNG DỤNG (App Promo) */}
            <div className="app-promo-section">
              <div className="app-promo-container">
                <div className="app-promo-text">
                  <h2>Chạm Trải Nghiệm<br/>Nhận Ngàn Ưu Đãi</h2>
                  <p>Tải ngay ứng dụng FIVEFOOD để dễ dàng đặt món, tích điểm thành viên và nhận các khuyến mãi độc quyền chỉ có trên mobile app.</p>
                  <div className="app-buttons">
                    <button className="app-btn">
                      <div className="app-btn-icon">🍏</div>
                      <div className="app-btn-text">
                        <span>Tải trên</span>
                        <strong>App Store</strong>
                      </div>
                    </button>
                    <button className="app-btn">
                      <div className="app-btn-icon">▶️</div>
                      <div className="app-btn-text">
                        <span>Tải trên</span>
                        <strong>Google Play</strong>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="app-promo-mockup">
                  <div className="mockup-glow"></div>
                  <div className="phone-mockup">
                    <div className="mockup-header">
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>FIVEFOOD</h3>
                      <div className="mockup-search"></div>
                    </div>
                    <div className="mockup-body">
                      <div className="mockup-content-wrapper">
                        <div className="mockup-card">
                          <div className="mockup-card-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?q=80&w=200&auto=format&fit=crop')" }}></div>
                          <div className="mockup-card-info">
                            <h4 className="mockup-food-name">Phở Bò Đặc Biệt</h4>
                            <span className="mockup-food-price">55.000đ</span>
                            <button className="mockup-order-btn">Đặt ngay</button>
                          </div>
                        </div>
                        <div className="mockup-card">
                          <div className="mockup-card-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=200&auto=format&fit=crop')" }}></div>
                          <div className="mockup-card-info">
                            <h4 className="mockup-food-name">Pizza Hải Sản</h4>
                            <span className="mockup-food-price">120.000đ</span>
                            <button className="mockup-order-btn">Đặt ngay</button>
                          </div>
                        </div>
                        <div className="mockup-card">
                          <div className="mockup-card-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop')" }}></div>
                          <div className="mockup-card-info">
                            <h4 className="mockup-food-name">Burger Phô Mai</h4>
                            <span className="mockup-food-price">65.000đ</span>
                            <button className="mockup-order-btn">Đặt ngay</button>
                          </div>
                        </div>
                      </div>
                      <div className="mockup-finger"></div>
                      
                      {/* Giao diện Thanh toán mô phỏng */}
                      <div className="mockup-order-screen">
                        <div className="order-screen-header">
                          <span className="order-back">←</span>
                          <span>Thanh toán</span>
                          <span style={{color: 'transparent'}}>←</span>
                        </div>
                        <div className="order-screen-item">
                          <div className="order-item-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=200&auto=format&fit=crop')" }}></div>
                          <div className="order-item-info">
                            <h5>Pizza Hải Sản</h5>
                            <span>120.000đ</span>
                          </div>
                        </div>
                        <div className="order-screen-details">
                          <div className="order-row"><span>Giao đến:</span> <strong>123 Nguyễn Văn Cừ</strong></div>
                          <div className="order-row"><span>Phí giao:</span> <strong>15.000đ</strong></div>
                          <div className="order-total"><span>Tổng:</span> <strong>135.000đ</strong></div>
                        </div>
                        <button className="order-screen-btn">Xác nhận đặt hàng</button>
                      </div>

                      <div className="mockup-success-toast">
                        <span className="toast-icon">✓</span>
                        Thanh toán thành công
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PHẦN 5: ĐÁNH GIÁ & ĐĂNG KÝ (Elegant CTA) */}
            <div className="elegant-cta-section">
              <div className="testimonial-elegant">
                <div className="giant-quote">"</div>
                <p className="testimonial-elegant-text">
                  Mọi thứ quá hoàn hảo! Không gian ứng dụng đẹp mắt, giao hàng nhanh chóng và chất lượng món ăn thực sự vượt xa sự mong đợi của tôi. FIVEFOOD là lựa chọn số 1.
                </p>
                <div className="testimonial-elegant-author">
                  <div className="author-elegant-avatar">👩</div>
                  <div className="author-elegant-info">
                    <h4>Nguyễn Thu Hà</h4>
                    <span>Khách hàng thân thiết</span>
                  </div>
                </div>
              </div>
              <div className="cta-elegant">
                <h2>Không Bỏ Lỡ<br/>Hương Vị Mới</h2>
                <p>Đăng ký nhận bản tin để là người đầu tiên biết về các món ăn mới, ưu đãi sốc và các sự kiện ẩm thực hấp dẫn của chúng tôi.</p>
                <div className="cta-input-group">
                  <input type="email" placeholder="Nhập địa chỉ email của bạn..." />
                  <button>Đăng ký</button>
                </div>
              </div>
            </div>

          </>
        )}

        {activeTab === 'menu' && (
          <div id="products-grid" className="products-section full-width fade-in" style={{ paddingTop: '20px', maxWidth: '100%', margin: 0, width: '100%' }}>
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
              {(() => {
                const filteredProducts = [...products]
                  .filter(p => p.IsActive || p.IsActive === undefined)
                  .filter(p => p.ProductName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .filter(p => selectedCategory === 'All' || p.CategoryName === selectedCategory)
                  .sort((a, b) => {
                    if (sortBy === 'priceAsc') return a.Price - b.Price;
                    if (sortBy === 'priceDesc') return b.Price - a.Price;
                    if (sortBy === 'newest') return b.ProductID - a.ProductID;
                    return 0; // 'all'
                  });

                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

                return (
                  <>
                    {paginatedProducts.map(renderProductCard)}
                  </>
                );
              })()}
            </div>
            
            {/* Pagination Controls */}
            {(() => {
              const filteredProducts = [...products]
                .filter(p => p.IsActive || p.IsActive === undefined)
                .filter(p => p.ProductName.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(p => selectedCategory === 'All' || p.CategoryName === selectedCategory);
              
              const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
              if (totalPages <= 1) return null;

              return (
                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px', flexWrap: 'wrap' }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={{ 
                      padding: '8px 16px', borderRadius: '25px', border: '1px solid #ddd', 
                      background: currentPage === 1 ? '#f5f5f5' : '#fff', 
                      color: currentPage === 1 ? '#999' : '#333',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '500', transition: 'all 0.2s'
                    }}
                  >
                    Trước
                  </button>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                          background: currentPage === page ? 'linear-gradient(135deg, #ff5722 0%, #ff8a65 100%)' : '#f1f3f5',
                          color: currentPage === page ? '#fff' : '#444',
                          fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s',
                          boxShadow: currentPage === page ? '0 4px 10px rgba(255, 87, 34, 0.3)' : 'none'
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={{ 
                      padding: '8px 16px', borderRadius: '25px', border: '1px solid #ddd', 
                      background: currentPage === totalPages ? '#f5f5f5' : '#fff', 
                      color: currentPage === totalPages ? '#999' : '#333',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: '500', transition: 'all 0.2s'
                    }}
                  >
                    Sau
                  </button>
                </div>
              );
            })()}
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
                            toast('Vui lòng đăng nhập để tiến hành đặt hàng.');
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
                className={`subtab-btn ${adminSubtab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setAdminSubtab('dashboard'); fetchAdminOrders(); fetchAdminUsersCount(); }}
              >
                📊 Dashboard Thống kê
              </button>
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

            {adminSubtab === 'dashboard' && (
              <AdminDashboard 
                orders={adminOrders} 
                products={products} 
                categories={categories} 
                usersCount={adminUsersCount} 
              />
            )}

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
                          <label>Link ảnh (URL) hoặc Emoji</label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={productForm.imageUrl}
                            onChange={(e) => setProductForm({...productForm, imageUrl: e.target.value})}
                            placeholder="Ví dụ: /images/banh-mi.jpg hoặc 🍔" 
                            required 
                          />
                        </div>
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label>Giá bán (đ)</label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={productForm.price !== undefined && productForm.price !== '' ? Number(productForm.price).toLocaleString('vi-VN') : ''}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace(/\D/g, '');
                              setProductForm({...productForm, price: rawVal ? parseInt(rawVal, 10) : ''});
                            }}
                            placeholder="35.000" 
                            required 
                          />
                        </div>

                        <div className="form-group">
                          <label>Số lượng kho</label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={productForm.inventory !== undefined && productForm.inventory !== '' ? Number(productForm.inventory).toLocaleString('vi-VN') : ''}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace(/\D/g, '');
                              setProductForm({...productForm, inventory: rawVal ? parseInt(rawVal, 10) : ''});
                            }}
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
                      <div className="form-group">
                        <label>Link ảnh (URL) hoặc Emoji</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={categoryForm.imageUrl || ''}
                          onChange={(e) => setCategoryForm({...categoryForm, imageUrl: e.target.value})}
                          placeholder="Ví dụ: /images/banner.jpg hoặc 🍕" 
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
                            <td>
                              {prod.ImageURL && (prod.ImageURL.startsWith('http') || prod.ImageURL.startsWith('/')) ? (
                                <img src={prod.ImageURL} alt={prod.ProductName} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                              ) : (
                                <span className="table-emoji">{prod.ImageURL || '🍔'}</span>
                              )}
                            </td>
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
                              {/* Nút hủy đơn hàng đã bị xóa theo yêu cầu (Chỉ khách hàng mới có quyền hủy) */}
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
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.Email}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Session: {log.SessionID.substring(0, 8)}...</div>
                            </td>
                            <td><div style={{ whiteSpace: 'pre-wrap', color: 'var(--primary-color)', fontWeight: '500' }}>{log.userMessage}</div></td>
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
          <div className="auth-container glass-panel fade-in" style={{ position: 'relative' }}>
            <button 
              onClick={() => setActiveTab('home')}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Đóng"
            >
              ✕
            </button>
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
          <div className="auth-container glass-panel fade-in" style={{ position: 'relative' }}>
            <button 
              onClick={() => setActiveTab('home')}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Đóng"
            >
              ✕
            </button>
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
                  <label style={{ fontWeight: 'bold' }}><MapPin size={18} style={{marginRight: 4}}/> Địa chỉ giao hàng</label>
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

      {selectedOrderDetails && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal glass-panel" style={{ borderRadius: '24px', maxWidth: '600px', background: 'var(--panel-bg)', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #00a8ff, #33b8ff)', padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>🧾</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '1px' }}>HÓA ĐƠN #{selectedOrderDetails.OrderID}</h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.9, fontWeight: '500' }}>
                    Cảm ơn bạn đã đồng hành cùng FIVEFOOD
                  </p>
                </div>
              </div>
              <button 
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onClick={() => setSelectedOrderDetails(null)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px 25px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '16px', border: '2px dashed rgba(150, 150, 150, 0.4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Khách hàng</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{selectedOrderDetails.FullName}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>{selectedOrderDetails.Phone}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Thời gian đặt</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{new Date(selectedOrderDetails.OrderDate).toLocaleTimeString('vi-VN')}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>{new Date(selectedOrderDetails.OrderDate).toLocaleDateString('vi-VN')}</span>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '12px', borderTop: '2px dashed rgba(150, 150, 150, 0.4)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Địa chỉ giao hàng</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} style={{ color: 'var(--primary-color)' }}/>
                    {selectedOrderDetails.ShippingAddress}
                  </span>
                </div>
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.03)', padding: '10px 15px', borderRadius: '25px', border: '2px solid rgba(150, 150, 150, 0.2)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '18px' }}>💳</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{selectedOrderDetails.PaymentMethod}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', background: selectedOrderDetails.PaymentStatus === 'Đã thanh toán' ? '#4caf50' : '#ff9800', color: '#fff', padding: '3px 8px', borderRadius: '10px' }}>{selectedOrderDetails.PaymentStatus}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.03)', padding: '10px 15px', borderRadius: '25px', border: '2px solid rgba(150, 150, 150, 0.2)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <span className={`status-pill status-${selectedOrderDetails.Status}`} style={{ margin: 0, padding: '4px 10px', fontSize: '13px' }}>{selectedOrderDetails.Status}</span>
                </div>
              </div>

              {selectedOrderDetails.Status === 'Đang giao' && selectedOrderDetails.Latitude && selectedOrderDetails.Longitude && (
                <div style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--panel-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                  <DeliveryTrackingMap 
                    customerLat={selectedOrderDetails.Latitude} 
                    customerLng={selectedOrderDetails.Longitude} 
                    shipperLat={shipperLocation && shipperLocation.orderId === selectedOrderDetails.OrderID ? shipperLocation.lat : null}
                    shipperLng={shipperLocation && shipperLocation.orderId === selectedOrderDetails.OrderID ? shipperLocation.lng : null}
                  />
                </div>
              )}

              {/* Order Items */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>📋 Chi Tiết Món Ăn</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedOrderDetails.items?.map((detail, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--input-bg)', padding: '12px 16px', borderRadius: '14px', border: '2px solid rgba(150, 150, 150, 0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: '600' }}>
                          {detail.ProductName} <strong style={{ color: 'var(--primary-color)', marginLeft: '6px', fontSize: '14px' }}>x{detail.Quantity}</strong>
                        </span>
                        {selectedOrderDetails.Status === 'Hoàn thành' && user?.role !== 'Admin' && (
                          <button 
                            className="btn btn-sm" 
                            style={{ padding: '6px 12px', fontSize: '12px', marginTop: '6px', alignSelf: 'flex-start', background: 'linear-gradient(135deg, #FF9800, #FF5722)', border: 'none', color: '#fff', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255, 87, 34, 0.3)', fontWeight: 'bold', transition: 'transform 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onClick={() => setReviewProductData({ 
                              product: { ProductID: detail.ProductID, ProductName: detail.ProductName },
                              orderId: selectedOrderDetails.OrderID 
                            })}
                          >
                            ⭐ Đánh giá ngay
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)' }}>{(detail.UnitPrice * detail.Quantity).toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: 'linear-gradient(145deg, rgba(0, 168, 255, 0.05) 0%, rgba(51, 184, 255, 0.1) 100%)', padding: '20px', borderRadius: '16px', border: '2px solid rgba(0, 168, 255, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>
                  <span>Tạm tính hàng:</span>
                  <span>{selectedOrderDetails.TotalAmount?.toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>
                  <span>Phí vận chuyển (OSRM):</span>
                  <span>{selectedOrderDetails.ShippingFee?.toLocaleString('vi-VN')} đ</span>
                </div>
                {selectedOrderDetails.DiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#4caf50', fontWeight: '700' }}>
                    <span>🎉 Giảm giá Voucher:</span>
                    <span>-{selectedOrderDetails.DiscountAmount?.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div style={{ borderTop: '2px dashed rgba(0, 168, 255, 0.4)', margin: '10px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Tổng thanh toán</span>
                  <span style={{ fontSize: '24px', fontWeight: '900', background: 'linear-gradient(to right, #FF3D00, #FF7A00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(255,61,0,0.2))' }}>
                    {selectedOrderDetails.FinalAmount?.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <button 
                  style={{ background: 'var(--input-bg)', border: '2px solid var(--panel-border)', color: 'var(--text-main)', padding: '12px 40px', borderRadius: '30px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--input-bg)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  onClick={() => setSelectedOrderDetails(null)}
                >
                  Đóng Hóa Đơn
                </button>
              </div>
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
            toast('Cảm ơn bạn đã gửi đánh giá!');
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
                if(!isLoggedIn) { toast('Vui lòng đăng nhập'); setActiveTab('login'); } else setActiveTab('orders');
              }}>Đơn Hàng</li>
              <li onClick={() => {
                if(!isLoggedIn) { toast('Vui lòng đăng nhập'); setActiveTab('login'); } else setActiveTab('favorites');
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
            <p><MapPin size={16} style={{marginRight: 4, display: "inline"}}/> 123 Đường Ẩm Thực, Cầu Giấy, Hà Nội</p>
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
