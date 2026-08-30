const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let lines = fs.readFileSync(cssPath, 'utf8').split('\n');

let newLines = [];
let inPromoBlock = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  if (!inPromoBlock && line.includes('.promo-list') && line.includes('{')) {
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
  
  // strip old promo classes
  if (!inPromoBlock && (line.includes('.promo-card {') || line.includes('.promo-code-badge {') || line.includes('.promo-discount-text {') || line.includes('.promo-desc {') || line.includes('.promo-card-header {') || line.includes('.promo-card-content {'))) {
      inPromoBlock = true;
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      continue;
  }
  
  newLines.push(line);
}

const cleanCSS = newLines.join('\n');

const newCSS = `
/* ========================================= */
/* FIVEFOOD VOUCHER MODAL (TIKTOK STYLE)     */
/* ========================================= */

/* Trigger Button inside Checkout */
.fivefood-voucher-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.fivefood-voucher-trigger:hover {
  border-color: #f97316;
  background: #fffaf5;
}
.voucher-trigger-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.voucher-icon {
  font-size: 24px;
}
.voucher-text {
  display: flex;
  flex-direction: column;
}
.voucher-title {
  font-weight: 600;
  color: #1e293b;
}
.voucher-desc {
  font-size: 13px;
  color: #64748b;
}
.voucher-applied-text {
  font-size: 13px;
  color: #f97316;
  font-weight: 600;
}
.voucher-arrow {
  color: #94a3b8;
  font-weight: bold;
}

body.dark-theme .fivefood-voucher-trigger {
  background: #1e293b;
  border-color: #334155;
}
body.dark-theme .fivefood-voucher-trigger:hover {
  background: #0f172a;
}
body.dark-theme .voucher-title { color: #f1f5f9; }

/* Modal Overlay & Container */
.fivefood-voucher-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 10000;
  animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

.fivefood-voucher-modal {
  background: #f4f4f4;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
}

body.dark-theme .fivefood-voucher-modal {
  background: #0f172a;
}

.fivefood-voucher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}
body.dark-theme .fivefood-voucher-header {
  background: #1e293b;
  border-color: #334155;
}

.fivefood-voucher-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}
body.dark-theme .fivefood-voucher-header h2 { color: #f1f5f9; }

.fivefood-voucher-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #64748b;
  cursor: pointer;
}

.fivefood-voucher-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.fivefood-voucher-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Tiktok Style Voucher Card */
.fivefood-voucher-card {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  position: relative;
}
body.dark-theme .fivefood-voucher-card {
  background: #1e293b;
}

.fivefood-voucher-left {
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  width: 95px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-right: 2px dashed #fed7aa;
  position: relative;
}
body.dark-theme .fivefood-voucher-left {
  background: linear-gradient(135deg, #431407, #7c2d12);
  border-color: #9a3412;
}

/* The perforated cutouts on top and bottom of the dashed line */
.fivefood-voucher-left::before,
.fivefood-voucher-left::after {
  content: '';
  position: absolute;
  right: -7px;
  width: 14px;
  height: 14px;
  background: #f4f4f4;
  border-radius: 50%;
  z-index: 2;
}
body.dark-theme .fivefood-voucher-left::before,
body.dark-theme .fivefood-voucher-left::after {
  background: #0f172a;
}
.fivefood-voucher-left::before { top: -7px; }
.fivefood-voucher-left::after { bottom: -7px; }

.fivefood-ticket-icon {
  font-size: 28px;
  color: #f97316;
}
.fivefood-ticket-label {
  font-size: 12px;
  color: #f97316;
  font-weight: 600;
  margin-top: 4px;
}

.fivefood-voucher-right {
  flex: 1;
  padding: 12px 12px 12px 16px;
  display: flex;
}

.fivefood-voucher-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-right: 8px;
}

.fivefood-voucher-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.tag-limit, .tag-source {
  font-size: 10px;
  color: #ea580c;
  background: #ffedd5;
  padding: 2px 6px;
  border-radius: 4px;
}
body.dark-theme .tag-limit, body.dark-theme .tag-source {
  background: #7c2d12;
  color: #fed7aa;
}

.fivefood-voucher-title {
  font-size: 18px;
  font-weight: 800;
  color: #f97316;
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.fivefood-voucher-subtitle {
  font-size: 13px;
  color: #475569;
  margin: 0 0 2px 0;
}
body.dark-theme .fivefood-voucher-subtitle { color: #cbd5e1; }

.fivefood-voucher-note {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 6px 0;
}

.fivefood-voucher-warning {
  font-size: 12px;
  color: #ea580c;
  margin: 0 0 8px 0;
}

.fivefood-voucher-footer {
  margin-top: auto;
  border-top: 1px solid #f1f5f9;
  padding-top: 6px;
}
body.dark-theme .fivefood-voucher-footer { border-color: #334155; }

.fivefood-progress-bar {
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  margin-bottom: 4px;
  overflow: hidden;
}
body.dark-theme .fivefood-progress-bar { background: #334155; }

.fivefood-progress-fill {
  height: 100%;
  background: #f97316;
  border-radius: 2px;
}
.fivefood-footer-text {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
}
.fivefood-footer-text a {
  color: #60a5fa;
  text-decoration: none;
}

.fivefood-voucher-action {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  min-width: 70px;
}

.live-tag {
  background: #fefce8;
  color: #ca8a04;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
body.dark-theme .live-tag { background: #713f12; color: #fef08a; }

.fivefood-btn-apply {
  background: #f97316;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
  margin-top: auto;
  margin-bottom: 4px;
}
.fivefood-btn-apply.applied {
  background: #10b981;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

.fivefood-voucher-card.disabled {
  opacity: 0.6;
}
.fivefood-voucher-card.disabled .fivefood-btn-apply {
  background: #cbd5e1;
  box-shadow: none;
  cursor: not-allowed;
  color: #fff;
}
body.dark-theme .fivefood-voucher-card.disabled .fivefood-btn-apply {
  background: #475569;
}

/* Options */
.fivefood-voucher-options {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
body.dark-theme .fivefood-voucher-options { background: #1e293b; }

.fivefood-no-voucher {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 15px;
  color: #1e293b;
}
body.dark-theme .fivefood-no-voucher { color: #f1f5f9; }

.fivefood-voucher-input-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
body.dark-theme .fivefood-voucher-input-section { background: #1e293b; }

.fivefood-voucher-input-section h4 {
  margin: 0 0 10px 0;
  font-size: 15px;
  color: #1e293b;
}
body.dark-theme .fivefood-voucher-input-section h4 { color: #f1f5f9; }

.fivefood-input-group {
  display: flex;
  gap: 8px;
}
.fivefood-input-group input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
}
body.dark-theme .fivefood-input-group input {
  background: #0f172a;
  border-color: #334155;
  color: #fff;
}
.fivefood-input-group button {
  background: #f97316;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.fivefood-voucher-submit {
  margin-top: 5px;
  padding-bottom: 10px;
}
.fivefood-voucher-submit button {
  width: 100%;
  padding: 14px;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}
.fivefood-voucher-submit button:hover {
  background: #ea580c;
}
`;

fs.writeFileSync(cssPath, cleanCSS + '\n' + newCSS);
console.log('Successfully injected Promo CSS');
