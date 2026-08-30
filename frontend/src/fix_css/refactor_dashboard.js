const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Admin/AdminDashboard.jsx', 'utf8');

code = code.replace(/background: 'rgba\\(15, 23, 42, 0\\.6\\)'/g, "background: 'var(--admin-panel)'");
code = code.replace(/background: 'rgba\\(30, 41, 59, 0\\.7\\)'/g, "background: 'var(--admin-panel)'");
code = code.replace(/color: '#e2e8f0'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#94a3b8'/g, "color: 'var(--admin-text-muted)'");
code = code.replace(/color: '#ffffff'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#fff'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#cbd5e1'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#f8fafc'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#64748b'/g, "color: 'var(--admin-text-muted)'");
code = code.replace(/background: 'linear-gradient\\(145deg, #1e293b 0%, #0f172a 100%\\)'/g, "background: 'var(--admin-panel)'");
code = code.replace(/border: '1px solid rgba\\(255, 255, 255, 0\\.05\\)'/g, "border: '1px solid var(--admin-border)'");
code = code.replace(/border: '1px solid rgba\\(255,255,255,0\\.05\\)'/g, "border: '1px solid var(--admin-border)'");
code = code.replace(/border: '1px solid rgba\\(255, 255, 255, 0\\.08\\)'/g, "border: '1px solid var(--admin-border)'");

fs.writeFileSync('frontend/src/components/Admin/AdminDashboard.jsx', code);
console.log('Done!');
