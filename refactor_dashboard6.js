const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Admin/AdminDashboard.jsx', 'utf8');

code = code.replace(/fill: '#94a3b8'/g, "fill: 'var(--admin-text-muted)'");
code = code.replace(/fill: '#e2e8f0'/g, "fill: 'var(--admin-text)'");
code = code.replace(/stroke="#64748b"/g, 'stroke="var(--admin-border)"');
code = code.replace(/color: #cbd5e1/g, "color: var(--admin-text)");
code = code.replace(/color: #fff/g, "color: var(--admin-text)");
code = code.replace(/rgba\(0,0,0,0.3\)/g, "var(--admin-input-bg)");
code = code.replace(/rgba\(255,255,255,0.2\)/g, "var(--admin-border)");

// Leaflet tooltip/popup hardcoded dark mode
code = code.replace(/background: rgba\(15, 22, 36, 0.95\) !important;/g, "background: var(--admin-panel) !important;");

fs.writeFileSync('frontend/src/components/Admin/AdminDashboard.jsx', code);
console.log('Done!');
