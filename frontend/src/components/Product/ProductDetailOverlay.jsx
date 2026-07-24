import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../utils/apiFetch';

export default function ProductDetailOverlay({ product, onClose, addToCart, isLoggedIn, setActiveTab, setIsCheckoutOpen }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSuspended = product.IsActive === false || product.Inventory <= 0;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await apiFetch(`http://localhost:3000/api/reviews/product/${product.ProductID}`);
        setReviews(data.reviews || []);
        setStats(data.stats || { AvgRating: 0, TotalReviews: 0 });
      } catch (error) {
        console.error('Lỗi khi tải đánh giá:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [product.ProductID]);

  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span key={star} style={{ color: star <= rating ? '#FFB800' : '#e0e0e0', fontSize: '14px', marginRight: '3px' }}>★</span>
    ));
  };

  return (
    <div className="premium-food-detail-overlay fade-in" onClick={onClose}>
      <div className="premium-food-detail-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Floating Header */}
        <div className="premium-header-actions">
          <button className="premium-back-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <button className="premium-heart-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        <div className="premium-scrollable">
          {/* Hero Image Section */}
          <div className="premium-hero-image">
            {product.ImageURL && product.ImageURL.length < 5 ? (
              <div className="premium-emoji-placeholder">{product.ImageURL}</div>
            ) : (
              <img 
                src={product.ImageURL || 'https://via.placeholder.com/800'} 
                alt={product.ProductName}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/800';
                }}
              />
            )}
            {isSuspended && <div className="premium-suspended-badge">Tạm ngưng</div>}
          </div>

          {/* Overlapping Content Card */}
          <div className="premium-content-card">
            
            <div className="premium-title-row">
              <h1 className="premium-title">{product.ProductName}</h1>
              <div className="premium-price">{product.Price.toLocaleString('vi-VN')}₫</div>
            </div>

            <div className="premium-meta-stats">
              <div className="premium-stat-pill">
                <span className="stat-icon">⭐</span>
                <span className="stat-value">{stats ? Number(stats.AvgRating).toFixed(1) : '0.0'}</span>
                <span className="stat-count">({stats ? stats.TotalReviews : 0})</span>
              </div>
              <div className="premium-stat-pill">
                <span className="stat-icon">🔥</span>
                <span className="stat-value">Đã bán {product.SoldCount || 0}</span>
              </div>
              <div className="premium-stat-pill">
                <span className="stat-icon">⏱️</span>
                <span className="stat-value">15-20 phút</span>
              </div>
            </div>

            <div className="premium-divider"></div>

            <div className="premium-section">
              <h3 className="premium-section-title">Chi tiết món ăn</h3>
              <p className="premium-desc-text">
                {product.Description || 'Món ăn đặc biệt thơm ngon và kích thích vị giác. Được chế biến từ những nguyên liệu tươi ngon nhất, mang lại trải nghiệm ẩm thực tuyệt vời.'}
              </p>
            </div>

            <div className="premium-divider"></div>

            <div className="premium-section">
              <h3 className="premium-section-title">Nguyên liệu làm nên món ăn</h3>
              <p className="premium-desc-text" style={{ fontStyle: 'italic', color: '#666' }}>
                {product.Ingredients || 'Chưa có thông tin nguyên liệu.'}
              </p>
            </div>

            <div className="premium-divider"></div>

            <div className="premium-section">
              <div className="premium-reviews-header">
                <h3 className="premium-section-title" style={{ margin: 0 }}>Đánh giá từ thực khách</h3>
                <span className="premium-view-all">Xem tất cả ({stats ? stats.TotalReviews : 0})</span>
              </div>

              {loading ? (
                <div className="premium-loading-text">Đang tải đánh giá...</div>
              ) : reviews.length === 0 ? (
                <div className="premium-empty-text">Chưa có đánh giá nào cho món này.</div>
              ) : (
                <div className="premium-reviews-list">
                  {reviews.map((review) => (
                    <div key={review.ReviewID} className="premium-review-item">
                      <div className="premium-review-user">
                        <div className="premium-avatar">{review.FullName.charAt(0).toUpperCase()}</div>
                        <div className="premium-user-info">
                          <div className="premium-user-name">{review.FullName}</div>
                          <div className="premium-user-date">{new Date(review.CreatedAt).toLocaleDateString('vi-VN')}</div>
                        </div>
                        <div className="premium-user-stars">{renderStars(review.Rating)}</div>
                      </div>
                      {review.Comment && <div className="premium-review-comment">{review.Comment}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '100px' }}></div>
          </div>
        </div>

        {/* Ultra-modern Sticky Bottom Bar */}
        <div className="premium-bottom-dock">
          <button className="premium-dock-icon-btn" onClick={() => { onClose(); setActiveTab('home'); }}>
            <span className="dock-icon">🏠</span>
            <span className="dock-label">Trang chủ</span>
          </button>
          
          <button className="premium-dock-icon-btn" onClick={() => {
            if (!isLoggedIn) {
              toast('Vui lòng đăng nhập để chat.');
              setActiveTab('login');
            } else {
              onClose();
              setActiveTab('contact');
            }
          }}>
            <span className="dock-icon">💬</span>
            <span className="dock-label">Chat</span>
          </button>

          <div className="premium-dock-actions">
            <button 
              className="premium-btn-cart"
              disabled={isSuspended}
              onClick={() => {
                if (isSuspended) return;
                addToCart(product, 1);
                toast(`Đã thêm ${product.ProductName} vào giỏ hàng!`);
              }}
            >
              Thêm vào giỏ
            </button>
            <button 
              className="premium-btn-buy"
              disabled={isSuspended}
              onClick={() => {
                if (isSuspended) return;
                addToCart(product, 1);
                onClose();
                if (!isLoggedIn) {
                  toast('Vui lòng đăng nhập để tiến hành đặt hàng.');
                  setActiveTab('login');
                } else {
                  setIsCheckoutOpen(true);
                }
              }}
            >
              Đặt ngay
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
