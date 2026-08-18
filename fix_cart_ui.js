const fs = require('fs');
const jsxPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.jsx';
let content = fs.readFileSync(jsxPath, 'utf8');

const targetStr = `              {cart.length === 0 ? (
                <div className="empty-cart-view" style={{ padding: '50px 20px' }}>
                  <span className="empty-emoji" style={{ fontSize: '60px' }}>🛒</span>
                  <p style={{ fontSize: '18px', marginTop: '15px' }}>Giỏ hàng của bạn đang trống.</p>
                  <button className="btn btn-primary" style={{ marginTop: '15px' }} onClick={() => setActiveTab('menu')}>Quay lại Trang Chủ để chọn món</button>
                </div>
              ) : (`;

const replaceStr = `              {cart.length === 0 ? (
                <div className="premium-empty-cart">
                  <div className="empty-cart-illustration">
                    <span className="empty-emoji bounce-animation">🛒</span>
                    <div className="empty-cart-shadow"></div>
                  </div>
                  <h3 className="empty-cart-title">Giỏ hàng đang trống!</h3>
                  <p className="empty-cart-desc">Vẫn còn rất nhiều món ngon đang chờ bạn khám phá. Hãy chọn cho mình một món thật ưng ý nhé!</p>
                  <button className="premium-explore-btn" onClick={() => setActiveTab('menu')}>
                    Khám phá Menu ngay <span className="arrow-icon">→</span>
                  </button>
                </div>
              ) : (`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(jsxPath, content);
  console.log('Successfully updated empty cart UI in App.jsx');
} else {
  console.log('Target string not found in App.jsx. Already updated or changed?');
}
