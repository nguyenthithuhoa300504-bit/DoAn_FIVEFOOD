import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { useCart } from '../../context/CartContext';

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
    <div className="recommendations-section glass-panel" style={{ marginBottom: '30px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#ff9800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          ✨ Gợi Ý Dành Riêng Cho Bạn
        </h2>
        <span style={{ marginLeft: '15px', padding: '4px 12px', background: 'rgba(255, 87, 34, 0.2)', borderRadius: '20px', fontSize: '12px', color: '#ff5722', fontWeight: 'bold' }}>
          HOT
        </span>
      </div>

      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }} className="custom-scrollbar">
        {recommendations.map(product => (
          <div key={product.ProductID} className="product-card glass-panel" style={{ minWidth: '220px', flex: '0 0 auto' }}>
            <div className="product-img" style={{ height: '120px' }}>
              <span className="food-emoji">{product.ImageURL || '🍔'}</span>
            </div>
            <div className="product-info">
              <h3 style={{ fontSize: '16px' }}>{product.ProductName}</h3>
              <p className="price" style={{ fontSize: '14px' }}>{product.Price.toLocaleString('vi-VN')} đ</p>
            </div>
            <button 
              className="btn btn-primary btn-add-cart" 
              style={{ padding: '8px', fontSize: '13px' }}
              onClick={() => addToCart({
                ProductID: product.ProductID,
                ProductName: product.ProductName,
                Price: product.Price
              }, 1)}
            >
              🛒 Thêm
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationSection;
