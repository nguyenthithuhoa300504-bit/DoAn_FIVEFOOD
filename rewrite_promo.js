const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let lines = fs.readFileSync(cssPath, 'utf8').split('\n');

// 1. Remove all existing promo-card rules
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
  
  // also strip out any standalone promo rules just in case
  if (line.includes('FORCE FIX VOUCHER CARDS')) {
    continue; // skip the comment
  }

  // Check for the promo-code-badge block as well (which might not start with .promo-card)
  if (!inPromoBlock && (line.includes('.promo-code-badge {') || line.includes('.promo-discount-text {') || line.includes('.promo-desc {') || line.includes('.promo-card-header {') || line.includes('.promo-card-content {'))) {
      inPromoBlock = true;
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      continue;
  }
  
  newLines.push(line);
}

const cleanCSS = newLines.join('\n');

const newPromoCSS = `
/* ========================================= */
/* PREMIUM VOUCHER CARDS (MÃ GIẢM GIÁ)       */
/* ========================================= */
.promo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.promo-card {
  display: flex;
  background: rgba(255, 138, 0, 0.05);
  border: 1px dashed rgba(255, 138, 0, 0.4);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.promo-card:hover {
  background: rgba(255, 138, 0, 0.08);
  border-color: rgba(255, 138, 0, 0.6);
}

.promo-card.selected {
  background: rgba(255, 138, 0, 0.12);
  border: 2px solid rgba(255, 138, 0, 0.8);
}

.promo-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.02);
  border-color: #d1d5db;
}

.promo-card input[type="radio"] {
  display: none;
}

.promo-card-content {
  flex: 1;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-left: 4px solid #ff8a00;
}

.promo-card.disabled .promo-card-content {
  border-left-color: #9ca3af;
}

.promo-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.promo-code-badge {
  background: linear-gradient(90deg, #ff8a00, #e52e71) !important;
  color: #ffffff !important;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  display: inline-block;
  visibility: visible !important;
  opacity: 1 !important;
}

.promo-card.disabled .promo-code-badge {
  background: #9ca3af !important;
}

.promo-discount-text {
  color: #ff8a00 !important;
  font-weight: 700;
  font-size: 15px;
}

.promo-card.disabled .promo-discount-text {
  color: #9ca3af !important;
}

.promo-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}
`;

fs.writeFileSync(cssPath, cleanCSS + '\n' + newPromoCSS);
console.log('Successfully rewritten promo-card CSS');
