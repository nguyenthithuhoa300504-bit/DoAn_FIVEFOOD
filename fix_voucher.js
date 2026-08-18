const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const voucherFixCSS = `
/* --- FORCE FIX VOUCHER CARDS (MÃ GIẢM GIÁ) --- */
.promo-card {
  background: rgba(255, 138, 0, 0.05) !important;
  border: 1px dashed rgba(255, 138, 0, 0.6) !important;
  border-radius: 12px !important;
  display: flex !important;
  width: 100% !important;
}

body.dark-theme .promo-card {
  background: rgba(255, 138, 0, 0.1) !important;
}

/* Remove fake cutouts because they mismatch glass-panel backgrounds */
.promo-card::before, .promo-card::after {
  display: none !important;
}

/* Force badge to be fully visible with bright gradient */
.promo-code-badge {
  display: inline-block !important;
  background: linear-gradient(90deg, #ff8a00, #e52e71) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  padding: 6px 14px !important;
  border-radius: 20px !important;
  font-weight: 800 !important;
  font-size: 13px !important;
  text-transform: uppercase !important;
  opacity: 1 !important;
  visibility: visible !important;
  box-shadow: 0 4px 10px rgba(229, 46, 113, 0.3) !important;
}

.promo-discount-text {
  color: #ff8a00 !important;
  -webkit-text-fill-color: #ff8a00 !important;
  font-weight: 900 !important;
  font-size: 16px !important;
}

.promo-card.disabled .promo-code-badge {
  background: #9ca3af !important;
  box-shadow: none !important;
}
.promo-card.disabled .promo-discount-text {
  color: #9ca3af !important;
  -webkit-text-fill-color: #9ca3af !important;
}
`;

fs.writeFileSync(cssPath, cssContent + '\n' + voucherFixCSS);
console.log('Appended voucher fixes to App.css');
