const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Admin/AdminDashboard.jsx', 'utf8');

const patternsToReplace = [
  "background: 'linear-gradient(135deg, rgba(25, 33, 49, 0.9) 0%, rgba(15, 20, 31, 0.95) 100%)'",
  "background: 'linear-gradient(145deg, rgba(28, 35, 51, 0.9) 0%, rgba(18, 22, 34, 0.95) 100%)'",
  "background: 'linear-gradient(145deg, rgba(22, 28, 42, 0.85) 0%, rgba(15, 19, 29, 0.95) 100%)'",
  "background: 'linear-gradient(145deg, rgba(22, 28, 42, 0.92) 0%, rgba(14, 18, 28, 0.98) 100%)'",
  "border: '1px solid rgba(255, 255, 255, 0.1)'",
  "border: '1px solid rgba(255, 255, 255, 0.08)'",
  "border: '1px solid rgba(255, 255, 255, 0.05)'",
  "borderBottom: '1px solid rgba(255,255,255,0.1)'"
];

patternsToReplace.forEach(pattern => {
  if (pattern.includes('background:')) {
    code = code.split(pattern).join("background: 'var(--admin-panel)'");
  } else if (pattern.includes('border:')) {
    code = code.split(pattern).join("border: '1px solid var(--admin-border)'");
  }
});

// For borderBottom separately
code = code.split("borderBottom: '1px solid rgba(255, 255, 255, 0.05)'").join("borderBottom: '1px solid var(--admin-border)'");
code = code.split("borderBottom: '1px solid rgba(255, 255, 255, 0.1)'").join("borderBottom: '1px solid var(--admin-border)'");

fs.writeFileSync('frontend/src/components/Admin/AdminDashboard.jsx', code);
console.log('Done replacement!');
