const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Admin/AdminDashboard.jsx', 'utf8');

code = code.replace(/background: 'linear-gradient\\(135deg, rgba\\(25, 33, 49, 0\\.9\\) 0%, rgba\\(15, 20, 31, 0\\.95\\) 100%\\)'/g, "background: 'var(--admin-panel)'");
code = code.replace(/background: 'linear-gradient\\(145deg, rgba\\(28, 35, 51, 0\\.9\\) 0%, rgba\\(18, 22, 34, 0\\.95\\) 100%\\)'/g, "background: 'var(--admin-panel)'");
code = code.replace(/border: '1px solid rgba\\(255, 255, 255, 0\\.08\\)'/g, "border: '1px solid var(--admin-border)'");
code = code.replace(/border: '1px solid rgba\\(255, 255, 255, 0\\.1\\)'/g, "border: '1px solid var(--admin-border)'");
code = code.replace(/border: '1px solid rgba\\(255, 255, 255, 0\\.2\\)'/g, "border: '1px solid var(--admin-border)'");
code = code.replace(/border-bottom: 1px solid rgba\\(255, 255, 255, 0\\.05\\)/g, "border-bottom: 1px solid var(--admin-border)");
code = code.replace(/borderBottom: '1px solid rgba\\(255,255,255,0\\.05\\)'/g, "borderBottom: '1px solid var(--admin-border)'");
code = code.replace(/color: '#ffffff'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#fff'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#e2e8f0'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#94a3b8'/g, "color: 'var(--admin-text-muted)'");
code = code.replace(/color: '#cbd5e1'/g, "color: 'var(--admin-text)'");
code = code.replace(/color: '#64748b'/g, "color: 'var(--admin-text-muted)'");
code = code.replace(/color: 'rgba\\(255, 255, 255, 0\\.8\\)'/g, "color: 'var(--admin-text-muted)'");

// Remove hardcoded text shadows if they clash with light mode
code = code.replace(/textShadow: '0 2px 10px rgba\\(255,179,0,0\\.25\\)'/g, "textShadow: 'none'");
code = code.replace(/textShadow: '0 2px 10px rgba\\(16,185,129,0\\.25\\)'/g, "textShadow: 'none'");
code = code.replace(/textShadow: '0 2px 10px rgba\\(59,130,246,0\\.25\\)'/g, "textShadow: 'none'");

fs.writeFileSync('frontend/src/components/Admin/AdminDashboard.jsx', code);
console.log('Done!');
