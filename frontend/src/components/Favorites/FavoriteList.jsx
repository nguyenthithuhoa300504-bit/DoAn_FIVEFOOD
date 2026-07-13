import React, { useState, useEffect } from 'react';
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
      alert('Lỗi khi xóa yêu thích: ' + error.message);
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
          <div key={product.FavoriteID} className="product-card glass-panel" style={{ position: 'relative' }}>
            <button 
              onClick={() => handleRemoveFavorite(product.ProductID)}
              style={{
                position: 'absolute', top: '10px', right: '10px', background: 'transparent',
                border: 'none', fontSize: '24px', cursor: 'pointer', zIndex: 10
              }}
              title="Bỏ yêu thích"
            >
              ❤️
            </button>
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
              <p className="text-muted" style={{ fontSize: '13px' }}>{product.CategoryName}</p>
            </div>
            <button 
              className="btn btn-primary btn-add-cart"
              onClick={() => onAddToCart(product, 1)}
            >
              🛒 Thêm giỏ hàng
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
