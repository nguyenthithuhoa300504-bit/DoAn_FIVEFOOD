const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Admin/AdminDashboard.jsx', 'utf8');

// Use a powerful regex that catches ALL linear-gradient backgrounds that use rgba(..., ..., ..., 0.85/0.9/0.95) for the main dark panels
code = code.replace(/background:\s*'linear-gradient\([^)]+rgba\(\d+,\s*\d+,\s*\d+,\s*0\.[89]\d*\).*?100%\)'/g, "background: 'var(--admin-panel)'");

fs.writeFileSync('frontend/src/components/Admin/AdminDashboard.jsx', code);
console.log('Regex replace done');
