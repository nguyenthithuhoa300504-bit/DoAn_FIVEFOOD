const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const premiumCartCSS = `
/* --- PREMIUM CART UI UPGRADES --- */

/* Empty Cart View */
.premium-empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: var(--panel-bg);
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  margin: 20px 0;
  border: 1px solid var(--panel-border);
}

.empty-cart-illustration {
  position: relative;
  margin-bottom: 20px;
}

.empty-emoji.bounce-animation {
  font-size: 80px;
  display: block;
  animation: bounce-float 3s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.empty-cart-shadow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 15px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 70%);
  border-radius: 50%;
  animation: shadow-pulse 3s ease-in-out infinite;
}

@keyframes bounce-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@keyframes shadow-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.5; }
  50% { transform: translateX(-50%) scale(0.7); opacity: 0.2; }
}

.empty-cart-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 10px 0;
}

.empty-cart-desc {
  font-size: 15px;
  color: var(--text-muted);
  max-width: 400px;
  margin: 0 auto 25px auto;
  line-height: 1.5;
}

.premium-explore-btn {
  background: linear-gradient(135deg, #FF7A00 0%, #E06B00 100%);
  color: white;
  border: none;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(255, 122, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.premium-explore-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(255, 122, 0, 0.4);
}

.premium-explore-btn .arrow-icon {
  transition: transform 0.3s ease;
}

.premium-explore-btn:hover .arrow-icon {
  transform: translateX(5px);
}

/* Glassmorphism Cart Items Upgrade */
.cart-items-list .cart-item.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

body.dark-theme .cart-items-list .cart-item.glass-panel {
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.cart-items-list .cart-item.glass-panel:hover {
  transform: translateX(5px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.1);
  border-color: rgba(255, 122, 0, 0.3);
}

body.dark-theme .cart-items-list .cart-item.glass-panel:hover {
  box-shadow: 0 12px 30px rgba(0,0,0,0.5);
}

/* Fix cart item layout for responsiveness */
@media (max-width: 768px) {
  .cart-item.glass-panel {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 15px;
  }
  .cart-item-actions {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
`;

fs.writeFileSync(cssPath, cssContent + '\n' + premiumCartCSS);
console.log('Appended premium cart CSS to App.css');
