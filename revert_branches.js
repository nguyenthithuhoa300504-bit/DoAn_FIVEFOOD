const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/Admin/AdminBranches.jsx', 'utf8');

code = code.replace(/var\(--admin-header-bg\)/g, "linear-gradient(135deg, rgba(22, 28, 42, 0.95) 0%, rgba(15, 19, 29, 0.98) 100%)");
code = code.replace(/var\(--admin-panel\)/g, "rgba(15, 23, 42, 0.6)");
code = code.replace(/var\(--admin-text\)/g, "#f8fafc");
code = code.replace(/var\(--admin-text-muted\)/g, "#94a3b8");
code = code.replace(/var\(--admin-border\)/g, "rgba(255, 255, 255, 0.08)");
code = code.replace(/var\(--admin-card-shadow\)/g, "0 10px 30px rgba(0,0,0,0.5)");
code = code.replace(/var\(--admin-input-bg\)/g, "rgba(255,255,255,0.03)");

// Any var(--primary-color) that might have been changed in my scripts?
// Let's just leave --primary-color alone since it's defined in index.css globally for both themes

fs.writeFileSync('frontend/src/components/Admin/AdminBranches.jsx', code);
console.log('Reverted AdminBranches.jsx');
