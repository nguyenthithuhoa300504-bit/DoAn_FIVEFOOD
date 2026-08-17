const fs = require('fs');

const appPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.jsx';
const dashboardPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\components\\Admin\\AdminDashboard.jsx';
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';

// 1. Refactor App.jsx
let appContent = fs.readFileSync(appPath, 'utf8');

// Add state to App.jsx
const appStateRegex = /const \[activeTabState, setActiveTabState\] = useState\('home'\);/;
const adminThemeState = `
  const [adminTheme, setAdminTheme] = useState(() => localStorage.getItem('admin_theme') || 'dark');
  const toggleAdminTheme = () => {
    const newTheme = adminTheme === 'dark' ? 'light' : 'dark';
    setAdminTheme(newTheme);
    localStorage.setItem('admin_theme', newTheme);
  };
`;
if (!appContent.includes('const [adminTheme, setAdminTheme]')) {
  appContent = appContent.replace(appStateRegex, `const [activeTabState, setActiveTabState] = useState('home');\n${adminThemeState}`);
}

// Add className to app-container
appContent = appContent.replace(
  /<div className=\{`app-container \$\{isAdminRoute \? 'admin-theme-wrapper' : ''\}`\}>/,
  `<div className={\`app-container \${isAdminRoute ? \`admin-theme-wrapper \${adminTheme}-mode\` : ''}\`}>`
);

// Add Sun/Moon toggle to Topbar
const toggleBtnHtml = `
              <button 
                onClick={toggleAdminTheme}
                style={{
                  background: adminTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  border: '1px solid ' + (adminTheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: adminTheme === 'dark' ? '#fff' : '#0f172a',
                  transition: 'all 0.3s'
                }}
                title="Chuyển Giao diện Sáng/Tối"
              >
                {adminTheme === 'dark' ? '☀️' : '🌙'}
              </button>
`;
if (!appContent.includes('toggleAdminTheme')) {
  appContent = appContent.replace(
    /<div className="header-actions" style=\{\{ gap: '16px', display: 'flex', alignItems: 'center' \}\}>/,
    `<div className="header-actions" style={{ gap: '16px', display: 'flex', alignItems: 'center' }}>\n${toggleBtnHtml}`
  );
}

// Pass isDark to AdminDashboard
appContent = appContent.replace(
  /<AdminDashboard\s+orders=\{adminOrders\}\s+products=\{products\}\s+categories=\{categories\}\s+usersCount=\{adminUsersCount\}\s+branchesMap=\{branchesMap\}\s*\/>/,
  `<AdminDashboard \n                orders={adminOrders} \n                products={products} \n                categories={categories} \n                usersCount={adminUsersCount} \n                branchesMap={branchesMap}\n                isDark={adminTheme === 'dark'}\n                />`
);

fs.writeFileSync(appPath, appContent);

// 2. Refactor AdminDashboard.jsx
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Update Props
dashboardContent = dashboardContent.replace(
  /const AdminDashboard = \(\{ orders = \[\], products = \[\], categories = \[\], usersCount = 0 \}\) => \{/,
  `const AdminDashboard = ({ orders = [], products = [], categories = [], usersCount = 0, isDark = true }) => {`
);

// Remove local state
dashboardContent = dashboardContent.replace(
  /const \[theme, setTheme\] = useState\(\(\) => localStorage\.getItem\('admin_theme'\) \|\| 'dark'\);\s*const isDark = theme === 'dark';\s*const toggleTheme = \(\) => \{[\s\S]*?\};\s*/,
  ""
);

// Remove local button
dashboardContent = dashboardContent.replace(
  /<button onClick=\{toggleTheme\}[\s\S]*?<\/button>/,
  ""
);

fs.writeFileSync(dashboardPath, dashboardContent);

// 3. Add Light Mode CSS to App.css
let cssContent = fs.readFileSync(cssPath, 'utf8');

const lightModeCss = `
/* ========================================================
   GIAO DIỆN LIGHT MODE (SÁNG) CHO TOÀN BỘ TRANG ADMIN
   Được kích hoạt thông qua class .light-mode trên admin-theme-wrapper
   ======================================================== */
.admin-theme-wrapper.light-mode {
  background-color: #f8fafc !important;
  color: #0f172a !important;
}

.admin-theme-wrapper.light-mode .header-bar {
  background: #ffffff !important;
  border-bottom: 2px solid #e2e8f0 !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
}

.admin-theme-wrapper.light-mode .logo-text-dark {
  color: #0f172a !important;
}

.admin-theme-wrapper.light-mode .admin-subtabs {
  background: rgba(255, 255, 255, 0.85) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05) !important;
}

.admin-theme-wrapper.light-mode .subtab-btn {
  color: #475569 !important;
}

.admin-theme-wrapper.light-mode .subtab-btn:hover {
  background: rgba(0, 0, 0, 0.04) !important;
  color: #0f172a !important;
}

.admin-theme-wrapper.light-mode .subtab-btn.active {
  background: linear-gradient(135deg, #FFB300 0%, #FF7A00 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 15px rgba(255, 138, 0, 0.3) !important;
}

.admin-theme-wrapper.light-mode .glass-panel,
.admin-theme-wrapper.light-mode .admin-form-card {
  background: rgba(255, 255, 255, 0.85) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  color: #0f172a !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05) !important;
}

.admin-theme-wrapper.light-mode .form-control,
.admin-theme-wrapper.light-mode select,
.admin-theme-wrapper.light-mode input {
  background: #f1f5f9 !important;
  border: 1px solid rgba(0, 0, 0, 0.15) !important;
  color: #0f172a !important;
}

.admin-theme-wrapper.light-mode table,
.admin-theme-wrapper.light-mode th,
.admin-theme-wrapper.light-mode td {
  border-color: rgba(0, 0, 0, 0.06) !important;
  color: #1e293b !important;
}

.admin-theme-wrapper.light-mode tr:hover td {
  background: rgba(0, 0, 0, 0.03) !important;
  color: #0f172a !important;
}

.admin-theme-wrapper.light-mode .admin-products-table-container {
  background: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05) !important;
}

.admin-theme-wrapper.light-mode .admin-table th {
  background: #f8fafc !important;
  color: #d97706 !important;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1) !important;
}

.admin-theme-wrapper.light-mode .list-header h2 {
  background: linear-gradient(to right, #0f172a, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.admin-theme-wrapper.light-mode .admin-stat-chip {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-left: 4px solid #FFB300 !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05) !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip span {
  color: #64748b !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip h3 {
  color: #0f172a !important;
  text-shadow: none !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip:hover {
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1) !important;
  border-color: rgba(0, 0, 0, 0.15) !important;
  border-left-color: #FFB300 !important;
}
`;

if (!cssContent.includes('.admin-theme-wrapper.light-mode')) {
  fs.writeFileSync(cssPath, cssContent + '\n' + lightModeCss);
}

console.log('Refactor completed successfully!');
