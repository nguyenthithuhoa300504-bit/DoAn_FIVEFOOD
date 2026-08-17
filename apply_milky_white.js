const fs = require('fs');

// --- 1. App.jsx ---
let appJsx = fs.readFileSync('frontend/src/App.jsx', 'utf8');

// Replace useEffect for body class
appJsx = appJsx.replace(
  /useEffect\(\(\) => \{\s*document\.body\.className = isDarkMode \? 'dark-theme' : '';\s*\}, \[isDarkMode\]\);/g,
  `useEffect(() => {\n    let classes = [];\n    if (isDarkMode) classes.push('dark-theme');\n    if (isAdminRoute) classes.push('admin-mode');\n    document.body.className = classes.join(' ');\n  }, [isDarkMode, isAdminRoute]);`
);

fs.writeFileSync('frontend/src/App.jsx', appJsx);

// --- 2. index.css ---
let indexCss = fs.readFileSync('frontend/src/index.css', 'utf8');

// Add body.admin-mode and update Milky White colors
const adminModeCss = `
body.admin-mode {
  background: var(--admin-bg) !important;
}
`;

if (!indexCss.includes('body.admin-mode')) {
  indexCss += adminModeCss;
}

// Ensure Milky White is set
indexCss = indexCss.replace(/--admin-bg: #[A-F0-9]+;/ig, '--admin-bg: #FAF9F6;');
indexCss = indexCss.replace(/--admin-panel: #[A-F0-9]+;/ig, '--admin-panel: #FAF9F6;');
indexCss = indexCss.replace(/--admin-header-bg: #[A-F0-9]+;/ig, '--admin-header-bg: #FAF9F6;');
indexCss = indexCss.replace(/--admin-input-bg: #[A-F0-9]+;/ig, '--admin-input-bg: #F0EFEA;');

fs.writeFileSync('frontend/src/index.css', indexCss);

console.log('App.jsx and index.css updated for Milky White admin mode!');
