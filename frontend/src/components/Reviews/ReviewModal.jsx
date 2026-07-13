import React, { useState } from 'react';
import { apiFetch } from '../../utils/apiFetch';

export default function ReviewModal({ product, orderId, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiFetch('http://localhost:3000/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.ProductID,
          orderId: orderId,
          rating: rating,
          comment: comment
        })
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gửi đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel fade-in" style={{ maxWidth: '400px' }}>
        <h2>Đánh giá món ăn</h2>
        <p style={{ marginBottom: '15px', fontWeight: 'bold' }}>{product.ProductName}</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label>Bạn chấm món này mấy sao?</label>
            <div style={{ fontSize: '32px', cursor: 'pointer', marginTop: '10px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star} 
                  onClick={() => setRating(star)}
                  style={{ color: star <= rating ? '#FFD700' : '#ccc', margin: '0 5px' }}
                >
                  ★
                </span>
              ))}
            </div>
            <p style={{ fontSize: '14px', color: '#ff5722', marginTop: '5px' }}>
              {rating === 1 && 'Rất tệ'}
              {rating === 2 && 'Tệ'}
              {rating === 3 && 'Bình thường'}
              {rating === 4 && 'Ngon'}
              {rating === 5 && 'Tuyệt vời!'}
            </p>
          </div>

          <div className="form-group">
            <label>Nhận xét của bạn (Không bắt buộc)</label>
            <textarea 
              className="form-control" 
              rows="3" 
              placeholder="Món ăn có hợp khẩu vị của bạn không?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
