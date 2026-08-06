import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import './CrossSellCombo.css';

export default function CrossSellCombo({ products = [], cart = [], onAddToCart }) {
  // Lọc ra các sản phẩm chưa có trong giỏ hàng và ưu tiên đồ uống / món ăn kèm có giá hợp lý (< 65,000đ)
  const cartIds = new Set(cart.map(item => item.ProductID));
  
  const availableItems = products.filter(p => !cartIds.has(p.ProductID));

  // Ưu tiên chọn món thuộc nhóm đồ uống hoặc món phụ giá phải chăng
  let suggestions = availableItems.filter(p => {
    const nameLower = p.ProductName ? p.ProductName.toLowerCase() : '';
    return nameLower.includes('coca') || nameLower.includes('nước') || nameLower.includes('trà') || 
           nameLower.includes('cà phê') || nameLower.includes('pepsi') || nameLower.includes('khoai') || 
           nameLower.includes('quẩy') || nameLower.includes('viên') || (p.Price && p.Price <= 45000);
  });

  // Nếu ít hơn 3 món thỏa mãn, lấy thêm các món bất kỳ khác chưa có trong giỏ hàng để hiển thị
  if (suggestions.length < 3 && availableItems.length > 0) {
    const fallbackItems = availableItems.filter(p => !suggestions.some(s => s.ProductID === p.ProductID));
    suggestions = [...suggestions, ...fallbackItems].slice(0, 5);
  } else {
    suggestions = suggestions.slice(0, 5);
  }

  // Nếu không có sản phẩm gợi ý nào thì ẩn component (an toàn tuyệt đối)
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="cross-sell-wrapper">
      <div className="cross-sell-header">
        <h4>
          <span>🍟 ✨</span> Thêm chút sảng khoái cho món chính
        </h4>
        <span className="cross-sell-badge">Ưu đãi mua kèm</span>
      </div>

      <div className="cross-sell-grid">
        {suggestions.map((item) => (
          <div key={item.ProductID} className="cross-sell-item-card">
            <div className="cross-sell-img-container">
              {item.ImageURL && item.ImageURL.length < 5 ? (
                <span style={{ fontSize: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.ImageURL}
                </span>
              ) : (
                <img 
                  src={item.ImageURL || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=80'} 
                  alt={item.ProductName} 
                  className="cross-sell-img"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=80'; 
                  }}
                />
              )}
            </div>
            
            <h5 className="cross-sell-name" title={item.ProductName}>
              {item.ProductName}
            </h5>
            
            <span className="cross-sell-price">
              {item.Price ? item.Price.toLocaleString('vi-VN') : 0} đ
            </span>

            <button 
              type="button" 
              className="cross-sell-add-btn"
              onClick={() => onAddToCart && onAddToCart(item)}
              title={`Thêm nhanh ${item.ProductName} vào giỏ`}
            >
              <Plus size={14} /> Thêm nhanh
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
