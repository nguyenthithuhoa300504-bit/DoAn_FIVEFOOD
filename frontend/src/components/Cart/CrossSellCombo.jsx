import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import './CrossSellCombo.css';

export default function CrossSellCombo({ products = [], cart = [], onAddToCart }) {
  // Lọc ra các sản phẩm chưa có trong giỏ hàng
  const cartIds = new Set(cart.map(item => item.ProductID));
  const availableItems = products.filter(p => !cartIds.has(p.ProductID));

  // Các hàm phân loại món ăn (Dựa trên tên món hoặc giá tiền)
  const isDrink = (p) => {
    const name = p.ProductName ? p.ProductName.toLowerCase() : '';
    return name.includes('coca') || name.includes('nước') || name.includes('trà') || 
           name.includes('cà phê') || name.includes('pepsi') || name.includes('sữa') || 
           name.includes('ép');
  };

  const isMainDish = (p) => {
    const name = p.ProductName ? p.ProductName.toLowerCase() : '';
    return name.includes('cơm') || name.includes('phở') || name.includes('bún') || 
           name.includes('mì') || name.includes('pizza') || name.includes('burger') || 
           name.includes('gà') || name.includes('bánh mì') || 
           (p.Price && p.Price >= 40000 && !isDrink(p));
  };

  const isSnackOrDessert = (p) => {
    const name = p.ProductName ? p.ProductName.toLowerCase() : '';
    return name.includes('chè') || name.includes('flan') || name.includes('khoai') || 
           name.includes('quẩy') || name.includes('viên') || name.includes('tráng miệng');
  };

  // Phân tích giỏ hàng hiện tại
  const hasMainDish = cart.some(item => isMainDish(item));
  const hasDrink = cart.some(item => isDrink(item));

  let headerTitle = "🎁 ✨ Gợi ý thêm cho bạn";
  let suggestions = [];

  // Logic Cross-selling thông minh theo ngữ cảnh
  if (hasMainDish && !hasDrink) {
    // Khách có món chính nhưng chưa có nước -> Gợi ý nước uống
    headerTitle = "🥤 ✨ Thêm chút sảng khoái cho món chính";
    suggestions = availableItems.filter(p => isDrink(p) || isSnackOrDessert(p));
  } 
  else if (!hasMainDish && hasDrink) {
    // Khách chỉ mua nước -> Gợi ý món ăn chính hoặc đồ ăn nhẹ
    headerTitle = "🍔 ✨ Ăn gì đó lót dạ cùng nước nhé!";
    suggestions = availableItems.filter(p => isMainDish(p) || isSnackOrDessert(p));
  } 
  else if (hasMainDish && hasDrink) {
    // Khách đã có cả đồ ăn và nước -> Gợi ý tráng miệng hoặc ăn vặt
    headerTitle = "🍮 ✨ Tráng miệng thêm chút ngọt ngào";
    suggestions = availableItems.filter(p => isSnackOrDessert(p));
  } 
  else {
    // Mặc định: Gợi ý các món phổ biến (Nước, Ăn vặt)
    headerTitle = "🍟 ✨ Ưu đãi hấp dẫn mua kèm";
    suggestions = availableItems.filter(p => isDrink(p) || isSnackOrDessert(p) || (p.Price && p.Price <= 45000));
  }

  // Nếu ít hơn 3 món thỏa mãn, lấy thêm các món bất kỳ khác để hiển thị (Fallback an toàn)
  if (suggestions.length < 3 && availableItems.length > 0) {
    const fallbackItems = availableItems.filter(p => !suggestions.some(s => s.ProductID === p.ProductID));
    suggestions = [...suggestions, ...fallbackItems].slice(0, 5);
    
    // Sửa lỗi: Nếu đang báo "Tráng miệng" nhưng quán hết món tráng miệng (phải dùng fallback) 
    // thì đổi lại tiêu đề cho phù hợp để không hiển thị trà sữa dưới mác "tráng miệng"
    if (hasMainDish && hasDrink) {
      headerTitle = "🎁 ✨ Ưu đãi hấp dẫn mua kèm";
    }
  } else {
    suggestions = suggestions.slice(0, 5);
  }

  // Nếu không có sản phẩm gợi ý nào thì ẩn component
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="cross-sell-wrapper">
      <div className="cross-sell-header">
        <h4>
          {headerTitle}
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
