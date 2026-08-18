const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const premiumHomeCSS = `
/* --- PREMIUM HOMEPAGE UI UPGRADES --- */

/* 1. Stunning Hero Banner */
.hero-banner {
  background: linear-gradient(135deg, rgba(255,122,0,0.05) 0%, rgba(224,107,0,0.15) 100%) !important;
  border-radius: 30px !important;
  border: 1px solid rgba(255, 122, 0, 0.2) !important;
  padding: 60px 40px !important;
  box-shadow: 0 20px 50px rgba(255,122,0,0.1) !important;
  position: relative;
  overflow: hidden;
  margin-bottom: 50px !important;
}

body.dark-theme .hero-banner {
  background: linear-gradient(135deg, rgba(25,33,49,0.8) 0%, rgba(15,20,31,0.95) 100%) !important;
  border-color: rgba(255, 122, 0, 0.3) !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
}

/* Glow orb behind the banner text */
.hero-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -20%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255,122,0,0.15) 0%, rgba(255,122,0,0) 70%);
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 2;
}

/* 2. Floating Category Pills (Swipeable) */
.featured-categories-section .categories-grid {
  display: flex !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  gap: 15px !important;
  padding-bottom: 20px !important;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */
}
.featured-categories-section .categories-grid::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

/* Make category cards look like premium pills */
.fc-card {
  flex: 0 0 auto !important;
  min-width: 140px !important;
  padding: 15px 25px !important;
  border-radius: 40px !important; /* Pill shape */
  display: flex !important;
  flex-direction: row !important; /* Icon and text side-by-side */
  align-items: center !important;
  justify-content: center !important;
  gap: 12px !important;
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}

body.dark-theme .fc-card {
  background: rgba(30, 30, 30, 0.7) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
}

.fc-card:hover {
  background: linear-gradient(135deg, #FF7A00 0%, #E06B00 100%) !important;
  color: white !important;
  transform: translateY(-4px) !important;
  box-shadow: 0 10px 20px rgba(255,122,0,0.3) !important;
}

.fc-card .fc-img-wrapper {
  width: 40px !important;
  height: 40px !important;
  border-radius: 50% !important;
  margin-bottom: 0 !important;
  background: transparent !important;
}

.fc-card h4 {
  font-size: 15px !important;
  margin: 0 !important;
  font-weight: 700 !important;
  white-space: nowrap;
}

/* Hide product count inside pills to save space */
.fc-card p {
  display: none !important;
}

/* Ensure mobile layout doesn't break */
@media (max-width: 768px) {
  .hero-banner {
    padding: 40px 20px !important;
    border-radius: 20px !important;
  }
}
`;

fs.writeFileSync(cssPath, cssContent + '\n' + premiumHomeCSS);
console.log('Appended premium homepage CSS to App.css');
