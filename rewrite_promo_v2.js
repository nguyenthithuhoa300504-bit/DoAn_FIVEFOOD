const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let lines = fs.readFileSync(cssPath, 'utf8').split('\n');

// Remove all promo-related rules from the file to start fresh
let newLines = [];
let inPromoBlock = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  if (!inPromoBlock && line.includes('.promo-card') && line.includes('{')) {
    inPromoBlock = true;
    braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    continue;
  }
  
  if (inPromoBlock) {
    braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    if (braceCount <= 0) {
      inPromoBlock = false;
    }
    continue;
  }
  
  if (line.includes('PREMIUM VOUCHER CARDS')) {
    continue; 
  }
  if (line.includes('FORCE FIX VOUCHER CARDS')) {
    continue; 
  }

  if (!inPromoBlock && (line.includes('.promo-code-badge {') || line.includes('.promo-discount-text {') || line.includes('.promo-desc {') || line.includes('.promo-list {') || line.includes('.promo-card-header {') || line.includes('.promo-card-content {'))) {
      inPromoBlock = true;
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      continue;
  }
  
  newLines.push(line);
}

const cleanCSS = newLines.join('\n');

const premiumPromoCSS = `
/* ========================================= */
/* PREMIUM VOUCHER CARDS (MÃ GIẢM GIÁ)       */
/* ========================================= */
.promo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 8px;
  margin-top: 10px;
}

/* Custom scrollbar for promo list */
.promo-list::-webkit-scrollbar {
  width: 6px;
}
.promo-list::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.02);
  border-radius: 10px;
}
.promo-list::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
}

.promo-card {
  display: flex;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  width: 100%;
  box-sizing: border-box;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}

body.dark-theme .promo-card {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(255,255,255,0.08);
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.promo-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(255, 122, 0, 0.12);
  border-color: rgba(255, 122, 0, 0.3);
}

.promo-card.selected {
  background: rgba(255, 122, 0, 0.03);
  border: 2px solid #ff7a00;
  box-shadow: 0 6px 20px rgba(255, 122, 0, 0.15);
}

body.dark-theme .promo-card.selected {
  background: rgba(255, 122, 0, 0.1);
}

.promo-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f8fafc;
  border-color: #e2e8f0;
  box-shadow: none;
}
body.dark-theme .promo-card.disabled {
  background: rgba(0,0,0,0.2);
  border-color: rgba(255,255,255,0.05);
}
.promo-card.disabled:hover {
  transform: none;
}

.promo-card input[type="radio"] {
  display: none;
}

/* Premium colored left-edge accent */
.promo-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, #ff7a00, #ff3366);
  opacity: 0.8;
  transition: all 0.3s ease;
}
.promo-card:hover::before {
  opacity: 1;
}
.promo-card.selected::before {
  opacity: 1;
  width: 8px;
}
.promo-card.disabled::before {
  background: #cbd5e1;
}

.promo-card-content {
  flex: 1;
  padding: 16px 20px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Stack badge and title vertically to avoid squishing/overlap */
.promo-card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.promo-code-badge {
  background: linear-gradient(90deg, #ff7a00, #ff3366) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  display: inline-block;
  box-shadow: 0 2px 6px rgba(255, 51, 102, 0.2);
}

.promo-card.disabled .promo-code-badge {
  background: #94a3b8 !important;
  box-shadow: none;
}

.promo-discount-text {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  font-weight: 800;
  font-size: 16px;
  line-height: 1.3;
}
body.dark-theme .promo-discount-text {
  color: #f1f5f9 !important;
  -webkit-text-fill-color: #f1f5f9 !important;
}

.promo-card.selected .promo-discount-text {
  color: #ff7a00 !important;
  -webkit-text-fill-color: #ff7a00 !important;
}

.promo-card.disabled .promo-discount-text {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
}

.promo-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin-top: 2px;
}
body.dark-theme .promo-desc {
  color: #94a3b8;
}
`;

fs.writeFileSync(cssPath, cleanCSS + '\n' + premiumPromoCSS);
console.log('Successfully applied Premium Voucher UI redesign');
