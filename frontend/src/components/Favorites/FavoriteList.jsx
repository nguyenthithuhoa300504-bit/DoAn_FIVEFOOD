import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../utils/apiFetch';

export default function FavoriteList({ onAddToCart }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      const data = await apiFetch('http://localhost:3000/api/favorites');
      setFavorites(data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách yêu thích:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (productId) => {
    try {
      await apiFetch(`http://localhost:3000/api/favorites/${productId}`, {
        method: 'DELETE',
      });
      setFavorites(favorites.filter((fav) => fav.ProductID !== productId));
    } catch (error) {
      toast('Lỗi khi xóa yêu thích: ' + error.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Đang tải danh sách yêu thích...</div>;

  if (favorites.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>💔 Bạn chưa có món ăn yêu thích nào</h3>
        <p className="text-muted">Hãy quay lại thực đơn và thả tim cho món bạn thích nhé!</p>
      </div>
    );
  }

  return (
    <div className="products-section glass-panel fade-in">
      <div className="section-header">
        <h2>💖 Món Ăn Yêu Thích Của Tôi</h2>
        <p className="text-muted">Danh sách các món ăn bạn đã "thả tim"</p>
      </div>

      <div className="product-cards-container">
        {favorites.map((product) => (
          <div key={product.FavoriteID} className="product-card new-design" style={{ cursor: 'default' }}>
            <div className="product-card-top">
              <div className="product-img-wrapper">
                <span className="card-badge category-badge">{product.CategoryName}</span>
                {!product.ImageURL || product.ImageURL === '🍔' || product.ImageURL.length < 5 ? (
                  <div className="emoji-placeholder" style={{ fontSize: '60px', width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '15px' }}>
                    {product.ImageURL && product.ImageURL !== '🍔' ? product.ImageURL : '🍔'}
                  </div>
                ) : (
                  <img 
                    src={product.ImageURL} 
                    alt={product.ProductName} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.outerHTML = '<div style="font-size: 60px; width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.03); border-radius: 15px;">🍔</div>';
                    }}
                  />
                )}
              </div>
              <button 
                className="float-btn heart-btn" 
                onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(product.ProductID); }}
                title="Bỏ yêu thích"
                style={{ color: '#ff4757', textShadow: '0 0 10px rgba(255,71,87,0.5)' }}
              >
                ❤️
              </button>
            </div>
            
            <div className="product-info" style={{ padding: '15px' }}>
              <div className="title-row" style={{ textAlign: 'left', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', margin: '0', color: 'var(--text-color)', fontWeight: 'bold', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.ProductName}</h3>
              </div>
              
              <div className="price-action-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '10px' }}>
                <div className="price-container" style={{ textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                  <span className="current-price" style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff3d00', whiteSpace: 'nowrap' }}>
                    {product.Price.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <button 
                  className="action-btn cart-btn-new"
                  onClick={(e) => { e.stopPropagation(); onAddToCart(product, 1); }}
                  title="Thêm vào giỏ"
                  style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #FF7A00, #E06B00)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255,122,0,0.3)', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
