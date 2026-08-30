const fs = require('fs');

// --- 1. Fix App.css ---
let appCss = fs.readFileSync('frontend/src/App.css', 'utf8');

// Wipe the .admin-theme-wrapper variables block entirely, or replace with empty
appCss = appCss.replace(/\.app-container\.admin-theme-wrapper,\s*\.admin-theme-wrapper\s*\{[\s\S]*?(?=\.admin-theme-wrapper \.checkout-modal)/, '');

// Erase admin-subtabs background
appCss = appCss.replace(/\.admin-subtabs\s*\{[\s\S]*?border-radius/g, '.admin-subtabs {\n    border-radius');

// Erase glass-panel background in admin
appCss = appCss.replace(/\.admin-theme-wrapper \.glass-panel,\s*\.admin-theme-wrapper \.admin-form-card\s*\{[\s\S]*?(?=border:)/g, '.admin-theme-wrapper .glass-panel,\n.admin-theme-wrapper .admin-form-card {\n    ');
appCss = appCss.replace(/color: #f8fafc !important;/g, '');

// Replace table colors
appCss = appCss.replace(/background: rgba\(23, 30, 47, 0\.95\) !important;/g, 'background: var(--admin-input-bg) !important;');
appCss = appCss.replace(/color: #e2e8f0 !important;/g, '');

appCss = appCss.replace(/\.admin-theme-wrapper \.admin-products-table-container\s*\{[\s\S]*?(?=box-shadow)/g, '.admin-theme-wrapper .admin-products-table-container {\n    border-radius: 18px;\n    border: 1px solid var(--admin-border);\n    ');

appCss = appCss.replace(/\.admin-theme-wrapper \.admin-stat-chip\s*\{[\s\S]*?(?=border-left:)/g, '.admin-theme-wrapper .admin-stat-chip {\n    background: var(--admin-panel);\n    border: 1px solid var(--admin-border);\n    ');
appCss = appCss.replace(/color: #94a3b8;/g, 'color: var(--admin-text-muted);');
appCss = appCss.replace(/color: #ffffff;/g, 'color: var(--admin-text);');

fs.writeFileSync('frontend/src/App.css', appCss);


// --- 2. Fix index.css for "Milky White" ---
let indexCss = fs.readFileSync('frontend/src/index.css', 'utf8');

// Light mode variables: Milky white for both bg and panel to create "one solid color" look
indexCss = indexCss.replace(/--admin-bg: #F8FAFC;/g, '--admin-bg: #FAF9F6;');
indexCss = indexCss.replace(/--admin-panel: #FFFFFF;/g, '--admin-panel: #FAF9F6;');
indexCss = indexCss.replace(/--admin-header-bg: #FFFFFF;/g, '--admin-header-bg: #FAF9F6;');
indexCss = indexCss.replace(/--admin-input-bg: #F1F5F9;/g, '--admin-input-bg: #F0EFEA;');

fs.writeFileSync('frontend/src/index.css', indexCss);

console.log('App.css and index.css updated!');
