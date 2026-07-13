import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';

export default function ProductReviewsModal({ product, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <span key={star} style={{ color: star <= rating ? '#FFD700' : '#ccc' }}>★</span>
    ));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel fade-in" style={{ maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>Đánh giá: {product.ProductName}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Đang tải đánh giá...</div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#FFD700' }}>
                {Number(stats.AvgRating).toFixed(1)} / 5.0
              </div>
              <div style={{ fontSize: '20px' }}>
                {renderStars(Math.round(stats.AvgRating))}
              </div>
              <p className="text-muted" style={{ margin: '5px 0 0 0' }}>Dựa trên {stats.TotalReviews} đánh giá</p>
            </div>

            {reviews.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa' }}>Chưa có đánh giá nào cho món ăn này.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {reviews.map((review) => (
                  <div key={review.ReviewID} style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong style={{ color: '#fff' }}>{review.FullName}</strong>
                      <span className="text-muted" style={{ fontSize: '12px' }}>
                        {new Date(review.CreatedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                      {renderStars(review.Rating)}
                    </div>
                    {review.Comment && (
                      <p style={{ margin: 0, fontSize: '14px', color: '#ddd' }}>{review.Comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
