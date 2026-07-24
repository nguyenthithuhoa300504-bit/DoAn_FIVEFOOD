import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { useCart } from '../../context/CartContext';
import { getDiscountForPrice } from '../../App';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const RecommendationSection = ({ isLoggedIn }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`${API_BASE_URL}/recommendations`);
        if (data && data.data) {
          setRecommendations(data.data);
        }
      } catch (err) {
        console.error('Không thể tải gợi ý món ăn', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isLoggedIn]);

  if (loading) {
    return <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>Đang tải món ăn gợi ý...</div>;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="recommendations-section fade-in" style={{ 
      maxWidth: '100%',
      margin: '0 0 40px 0',
      width: '100%',
      padding: '35px', 
      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', // Vibrant warm amber background
      borderRadius: '24px',
      border: '2px solid rgba(255, 152, 0, 0.2)', // Stronger border
      boxShadow: '0 15px 40px rgba(255, 152, 0, 0.15)', // Glowing orange shadow
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decoration */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,87,34,0.15) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-80px', left: '-20px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,193,7,0.2) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }}></div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 6px 20px rgba(255, 87, 34, 0.4)' }}>
            🔥
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', background: 'linear-gradient(90deg, #e65100, #ff3d00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 4px rgba(255,87,34,0.1)' }}>
              Món Ngon Dành Riêng Cho Bạn
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#d84315', fontWeight: '600' }}>Tuyển chọn từ khẩu vị & lịch sử của bạn</p>
          </div>
        </div>
        <span style={{ padding: '8px 20px', background: 'linear-gradient(90deg, #ff9800, #ff5722)', borderRadius: '30px', fontSize: '13px', color: '#fff', fontWeight: '800', boxShadow: '0 4px 15px rgba(255, 87, 34, 0.4)', animation: 'pulse 2s infinite', letterSpacing: '1px' }}>
          HOT NHẤT 🔥
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
        gap: '25px', 
        position: 'relative',
        zIndex: 1
      }}>
        {recommendations.slice(0, 8).map(product => (
          <div key={product.ProductID} style={{ 
            background: '#fff',
            borderRadius: '24px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '2px solid transparent', // Ready for hover border
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => { 
            e.currentTarget.style.transform = 'translateY(-10px)'; 
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 87, 34, 0.2)'; 
            e.currentTarget.style.borderColor = 'rgba(255, 87, 34, 0.4)';
          }}
          onMouseOut={(e) => { 
            e.currentTarget.style.transform = 'translateY(0)'; 
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)'; 
            e.currentTarget.style.borderColor = 'transparent';
          }}
          >
            {/* Recommendation Badge */}
            <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'linear-gradient(135deg, #ff3d00, #ff9100)', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '900', zIndex: 2, boxShadow: '0 4px 12px rgba(255,61,0,0.4)', border: '1px solid rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
              🌟 Đề Xuất
            </div>
            
            {/* Discount Badge */}
            <div style={{ position: 'absolute', top: '15px', right: '15px', background: '#ff3d00', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '900', zIndex: 2, boxShadow: '0 4px 12px rgba(255,61,0,0.4)', textTransform: 'uppercase' }}>
              -{getDiscountForPrice(product.Price)}%
            </div>

            {/* Product Image */}
            <div style={{ 
              width: '100%', 
              height: '180px', 
              minHeight: '180px',
              flexShrink: 0,
              borderRadius: '20px', 
              background: 'radial-gradient(circle at center, #fff9c4 0%, #ffcc80 100%)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(255,152,0,0.2)',
              position: 'relative',
              border: '1px solid rgba(255,152,0,0.1)',
              overflow: 'hidden'
            }}>
              {product.ImageURL && (product.ImageURL.includes('/') || product.ImageURL.includes('http') || product.ImageURL.length > 5) ? (
                <img src={product.ImageURL} alt={product.ProductName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.2))', transform: 'scale(1.1)', fontSize: '90px' }}>
                  {product.ImageURL || '🍔'}
                </div>
              )}
            </div>
            
            {/* Product Info & Action */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginTop: '5px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: 'var(--text-main)', fontWeight: '700', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {product.ProductName}
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '13px' }}>
                    {Math.round(product.Price / (1 - getDiscountForPrice(product.Price) / 100)).toLocaleString('vi-VN')} đ
                  </span>
                  <span style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--primary-color)' }}>
                    {product.Price.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Circular Add Button */}
                <button 
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: 'rgba(255, 87, 34, 0.1)', 
                    border: 'none',
                    color: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(255, 87, 34, 0.1)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 87, 34, 0.1)'; e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.transform = 'scale(1)'; }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click if you have one
                    addToCart({
                      ProductID: product.ProductID,
                      ProductName: product.ProductName,
                      Price: product.Price
                    }, 1);
                  }}
                  title="Thêm vào giỏ"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationSection;
