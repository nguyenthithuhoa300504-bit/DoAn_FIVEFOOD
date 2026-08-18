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

const minimalPromoCSS = `
/* ========================================= */
/* PREMIUM VOUCHER CARDS (MINIMAL UI)        */
/* ========================================= */
.promo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 220px; /* Reduced height to force a clear scrollbar */
  overflow-y: auto;
  padding: 10px;
  margin-top: 10px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

body.dark-theme .promo-list {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}

/* Custom scrollbar for promo list */
.promo-list::-webkit-scrollbar {
  width: 6px;
}
.promo-list::-webkit-scrollbar-track {
  background: transparent;
}
.promo-list::-webkit-scrollbar-thumb {
  background: rgba(255, 122, 0, 0.3);
  border-radius: 10px;
}
.promo-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 122, 0, 0.5);
}

.promo-card {
  display: flex;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}

body.dark-theme .promo-card {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(255,255,255,0.08);
}

.promo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(255, 122, 0, 0.12);
  border-color: rgba(255, 122, 0, 0.3);
}

.promo-card.selected {
  background: rgba(255, 122, 0, 0.05);
  border: 2px solid #ff7a00;
}

body.dark-theme .promo-card.selected {
  background: rgba(255, 122, 0, 0.1);
}

.promo-card.disabled {
  opacity: 0.5;
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
  width: 4px;
  background: linear-gradient(180deg, #ff7a00, #ff3366);
  transition: all 0.3s ease;
}
.promo-card.selected::before {
  width: 6px;
}
.promo-card.disabled::before {
  background: #cbd5e1;
}

.promo-card-content {
  flex: 1;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center; /* Center the badge */
}

.promo-card-header {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.promo-code-badge {
  background: linear-gradient(90deg, #ff7a00, #ff3366) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: inline-block;
  box-shadow: 0 4px 10px rgba(255, 51, 102, 0.25);
  margin: 0;
}

.promo-card.disabled .promo-code-badge {
  background: #94a3b8 !important;
  box-shadow: none;
}

/* USER REQUEST: Hide all extra text to keep only the code badge */
.promo-discount-text,
.promo-desc {
  display: none !important;
}
`;

fs.writeFileSync(cssPath, cleanCSS + '\n' + minimalPromoCSS);
console.log('Successfully applied Minimal Voucher UI redesign');
