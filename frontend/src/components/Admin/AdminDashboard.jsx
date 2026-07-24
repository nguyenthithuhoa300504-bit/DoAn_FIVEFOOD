import React, { useMemo, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import L from 'leaflet';

// Bảng màu rực rỡ (Neon/Vibrant)
const PIE_COLORS = ['#FF007A', '#7000FF', '#00E5FF', '#00FF85', '#FFB800', '#FF3D00'];

const AdminDashboard = ({ orders = [], products = [], categories = [], usersCount = 0 }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let completedOrders = 0;
    
    // Calculate last 7 days revenue
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { 
        date: d.toISOString().split('T')[0], 
        Revenue: 0, 
        Orders: 0, 
        displayDate: `${d.getDate()}/${d.getMonth()+1}` 
      };
    });

    orders.forEach(order => {
      if (order.Status === 'Hoàn thành') {
        totalRevenue += order.FinalAmount || order.TotalAmount || 0;
        completedOrders++;
      }
      
      const orderDate = new Date(order.OrderDate).toISOString().split('T')[0];
      const dayData = last7Days.find(d => d.date === orderDate);
      if (dayData) {
        dayData.Orders += 1;
        if (order.Status === 'Hoàn thành') {
          dayData.Revenue += (order.FinalAmount || order.TotalAmount || 0);
        }
      }
    });

    // Category distribution
    const categoryData = categories.map((cat, index) => {
      const count = products.filter(p => p.CategoryID === cat.CategoryID).length;
      return {
        name: cat.CategoryName,
        value: count,
        color: PIE_COLORS[index % PIE_COLORS.length]
      };
    }).filter(cat => cat.value > 0);

    return { totalRevenue, completedOrders, last7Days, categoryData };
  }, [orders, products, categories]);

  // Khởi tạo Bản đồ Leaflet
  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      // Giới hạn khu vực Bình Thuận
      const BinhThuanBounds = [
        [10.3, 107.2], // Tây Nam
        [11.9, 109.0]  // Đông Bắc
      ];

      // Khởi tạo bản đồ tại trung tâm Bình Thuận và khóa kéo/zoom ra ngoài
      mapInstance.current = L.map(mapRef.current, {
        maxBounds: BinhThuanBounds,
        maxBoundsViscosity: 1.0, // Khóa cứng, không cho kéo dãn ra ngoài
        minZoom: 9 // Không cho zoom xa ra để thấy các tỉnh khác
      }).setView([11.1, 108.1], 9);

      // Sử dụng tile tối màu (Dark mode tile) để hợp với theme dashboard
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current);

      // Fetch GeoJSON thực tế của Tỉnh Bình Thuận từ local file
      fetch('/binh_thuan_province.json')
        .then(res => res.json())
        .then(data => {
          // Tìm dữ liệu dạng Polygon hoặc MultiPolygon (vì data có thể chứa point)
          const polyData = data.find(d => d.geojson && (d.geojson.type === 'Polygon' || d.geojson.type === 'MultiPolygon'));
          if (polyData) {
            const geojsonLayer = L.geoJSON(polyData.geojson, {
              style: {
                color: '#00f2fe',
                weight: 4,
                opacity: 1,
                fillColor: '#00f2fe',
                fillOpacity: 0.1,
                dashArray: '5, 5'
              }
            }).addTo(mapInstance.current);

            // Bắt sự kiện Hover: chuyển sang Đỏ
            geojsonLayer.on('mouseover', function (e) {
              e.layer.setStyle({
                color: '#ff0000', // Đỏ rực
                fillColor: '#ff0000',
                fillOpacity: 0.4,
                weight: 5,
                dashArray: null // Bỏ nét đứt khi hover
              });
              geojsonLayer.bindTooltip("Biên giới Tỉnh Bình Thuận", { sticky: true }).openTooltip();
            });

            // Bắt sự kiện Mouseout: trả về Cyan
            geojsonLayer.on('mouseout', function (e) {
              e.layer.setStyle({
                color: '#00f2fe',
                fillColor: '#00f2fe',
                fillOpacity: 0.1,
                weight: 4,
                dashArray: '5, 5'
              });
              geojsonLayer.closeTooltip();
            });
          }
        })
        .catch(err => console.error('Lỗi tải dữ liệu bản đồ:', err));

      // Rải thêm một vài marker (Pin giả lập Đơn hàng/Ca bệnh)
      const pins = [
        [10.9333, 108.1000], [11.5, 108.3], [11.2, 107.8], [10.8, 107.6]
      ];
      
      const pinIcon = L.divIcon({
        html: '<div style="background: red; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px red;"></div>',
        className: 'custom-pin',
        iconSize: [15, 15],
        iconAnchor: [7, 7]
      });

      pins.forEach(coord => {
        L.marker(coord, { icon: pinIcon }).addTo(mapInstance.current);
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // CSS nội bộ cho hover và glassmorphism
  const styles = {
    card: {
      padding: '25px', 
      borderRadius: '20px', 
      background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    },
    iconWrap: {
      position: 'absolute',
      right: '-20px',
      top: '-20px',
      fontSize: '100px',
      opacity: '0.1',
      transform: 'rotate(-15deg)',
      transition: 'all 0.3s ease'
    },
    title: { margin: '0 0 10px 0', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' },
    value: { margin: 0, fontSize: '36px', color: '#fff', fontWeight: '800', textShadow: '0 2px 10px rgba(0,0,0,0.5)' },
    subtitle: { margin: '12px 0 0 0', fontSize: '13px', fontWeight: '500' }
  };

  return (
    <div className="admin-dashboard fade-in" style={{ padding: '20px', color: '#e2e8f0', minHeight: '80vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, background: 'linear-gradient(to right, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '32px', fontWeight: '900' }}>
            Tổng Quan Hệ Thống 🚀
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#94a3b8' }}>Theo dõi hiệu suất kinh doanh và tình trạng phân bổ giao hàng theo thời gian thực.</p>
        </div>
      </div>
      
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px', marginBottom: '40px' }}>
        <div className="stat-card" style={{ ...styles.card, borderTop: '4px solid #00f2fe' }}>
          <div className="icon-wrap" style={styles.iconWrap}>💰</div>
          <h4 style={styles.title}>Tổng Doanh Thu</h4>
          <h2 style={styles.value}>{stats.totalRevenue.toLocaleString('vi-VN')} đ</h2>
          <p style={{ ...styles.subtitle, color: '#00f2fe' }}>▲ Doanh thu từ đơn hoàn thành</p>
        </div>

        <div className="stat-card" style={{ ...styles.card, borderTop: '4px solid #00FF85' }}>
          <div className="icon-wrap" style={styles.iconWrap}>📦</div>
          <h4 style={styles.title}>Tổng Đơn Hàng</h4>
          <h2 style={styles.value}>{orders.length}</h2>
          <p style={{ ...styles.subtitle, color: '#00FF85' }}>★ {stats.completedOrders} đơn giao thành công</p>
        </div>

        <div className="stat-card" style={{ ...styles.card, borderTop: '4px solid #7000FF' }}>
          <div className="icon-wrap" style={styles.iconWrap}>👥</div>
          <h4 style={styles.title}>Tổng Khách Hàng</h4>
          <h2 style={styles.value}>{usersCount}</h2>
          <p style={{ ...styles.subtitle, color: '#b77bf3' }}>● Người dùng đăng ký</p>
        </div>

        <div className="stat-card" style={{ ...styles.card, borderTop: '4px solid #FF007A' }}>
          <div className="icon-wrap" style={styles.iconWrap}>🍔</div>
          <h4 style={styles.title}>Tổng Món Ăn</h4>
          <h2 style={styles.value}>{products.length}</h2>
          <p style={{ ...styles.subtitle, color: '#ff6b9e' }}>♦ Sẵn sàng phục vụ</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px', marginBottom: '30px' }}>
        
        {/* Area Chart */}
        <div className="chart-container" style={{ ...styles.card, padding: '30px', borderTop: 'none' }}>
          <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '30px', fontSize: '18px', fontWeight: 'bold' }}>📈 XU HƯỚNG DOANH THU (7 NGÀY)</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <AreaChart data={stats.last7Days} margin={{ top: 10, right: 30, bottom: 0, left: 20 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4facfe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#64748b" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#64748b" tickFormatter={(value) => `${value / 1000}k`} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}
                  itemStyle={{ color: '#00f2fe', fontWeight: 'bold', fontSize: '16px' }}
                  formatter={(value) => `${value.toLocaleString('vi-VN')} đ`}
                  labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Revenue" 
                  stroke="#00f2fe" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#00f2fe', boxShadow: '0 0 15px #00f2fe' }} 
                  name="Doanh thu" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="chart-container" style={{ ...styles.card, padding: '30px', borderTop: 'none' }}>
          <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '30px', fontSize: '18px', fontWeight: 'bold' }}>🍩 CƠ CẤU DANH MỤC MÓN ĂN</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={130}
                  paddingAngle={8}
                  dataKey="value"
                  label={({ name, percent }) => percent > 0.05 ? `${name}` : ''}
                  labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                  animationDuration={1500}
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}
                />
                <Legend 
                  wrapperStyle={{ color: '#e2e8f0', fontSize: '14px', paddingTop: '20px' }} 
                  iconType="circle"
                  iconSize={12}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaflet Map Section */}
      <div className="chart-container" style={{ ...styles.card, padding: '30px', borderTop: 'none', gridColumn: '1 / -1' }}>
        <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}><MapPin size={24} style={{ marginRight: "8px", verticalAlign: "bottom" }} /> BẢN ĐỒ VÙNG GIAO HÀNG & PHÂN BỔ ĐƠN</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
          * Di chuột vào khu vực có viền xanh dương (Cyan) để thấy hiệu ứng đổi màu cảnh báo (Đỏ rực).
        </p>
        <div 
          ref={mapRef} 
          style={{ width: '100%', height: '450px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
        ></div>
      </div>
      
      {/* Style injection cho hiệu ứng hover */}
      <style>{`
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px 0 rgba(0, 0, 0, 0.5) !important;
        }
        .stat-card:hover .icon-wrap {
          transform: rotate(0deg) scale(1.1) !important;
          opacity: 0.2 !important;
        }
        .leaflet-container {
          background-color: #0f172a !important; /* Fix nền khi tải map chậm */
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
