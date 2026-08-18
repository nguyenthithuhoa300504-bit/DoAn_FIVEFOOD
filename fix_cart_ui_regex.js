const fs = require('fs');
const jsxPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.jsx';
let content = fs.readFileSync(jsxPath, 'utf8');

const regex = /\{\s*cart\.length === 0 \? \(\s*<div className="empty-cart-view"[\s\S]*?<\/div>\s*\)\s*:\s*\(/;

const replaceStr = `{cart.length === 0 ? (
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

if (regex.test(content)) {
  content = content.replace(regex, replaceStr);
  fs.writeFileSync(jsxPath, content);
  console.log('Successfully updated empty cart UI using Regex in App.jsx');
} else {
  console.log('Target regex not found in App.jsx. Already updated or changed?');
}
