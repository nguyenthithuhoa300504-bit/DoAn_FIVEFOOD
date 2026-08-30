const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const shadowRules = `
/* --- USER REQUEST: Product card shadow enhancement --- */
/* Đổ bóng rõ nét hơn cho thẻ ở chế độ Sáng */
.dbs-product-card {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
  transition: all 0.3s ease !important;
}

/* Đổ bóng sâu hơn cho thẻ ở chế độ Tối */
body.dark-theme .dbs-product-card {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45) !important;
}

/* Hiệu ứng nảy lên và bóng đổ màu cam đậm hơn khi di chuột (Hover) */
.dbs-product-card:hover {
  transform: translateY(-8px) !important;
  box-shadow: 0 16px 40px rgba(255, 122, 0, 0.25) !important;
}
body.dark-theme .dbs-product-card:hover {
  box-shadow: 0 16px 40px rgba(255, 122, 0, 0.4) !important;
}
`;

fs.writeFileSync(cssPath, cssContent + '\n' + shadowRules);
console.log('Appended product card shadow fixes to App.css');
