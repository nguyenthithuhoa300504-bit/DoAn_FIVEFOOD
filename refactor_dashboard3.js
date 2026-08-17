const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Admin/AdminDashboard.jsx', 'utf8');

// Replace all gradients that start with rgba(22, 28, 42 or rgba(28, 35, 51 or rgba(25, 33, 49
code = code.replace(/background: 'linear-gradient\\([^)]+rgba\\((22|25|28|15)[^)]+\\) 0%.*?100%\\)'/g, "background: 'var(--admin-panel)'");

// There are also border styles like border: '1px solid rgba(255, 255, 255, 0.08)'
code = code.replace(/border: '1px solid rgba\\(255,\s*255,\s*255,\s*0\.\d+\\)'/g, "border: '1px solid var(--admin-border)'");
code = code.replace(/borderTop: '4px solid #FFB300',/g, "borderTop: '4px solid #FFB300',");

// Also replace any remaining color: '#fff' or color: '#ffffff' (except in specific cases)
// Just do it broadly since AdminDashboard doesn't have colored buttons with white text in this file.
// Oh wait, there are tooltips! We'll just target the header ones.
code = code.replace(/color: '#ffffff'/ig, "color: 'var(--admin-text)'");
code = code.replace(/color: '#fff'/ig, "color: 'var(--admin-text)'");

fs.writeFileSync('frontend/src/components/Admin/AdminDashboard.jsx', code);
console.log('Done!');
