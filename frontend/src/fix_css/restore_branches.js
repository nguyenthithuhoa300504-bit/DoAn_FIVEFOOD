const fs = require('fs');

let appJsx = fs.readFileSync('frontend/src/App.jsx', 'utf8');

// 1. Inject Branches subtab in menu
if (!appJsx.includes("adminSubtab === 'branches' ? 'active' : ''")) {
  appJsx = appJsx.replace(
    /(\s*<button\s*className={`subtab-btn \${adminSubtab === 'marketing' \? 'active' : ''}`}\s*onClick=\{[^}]+\}\s*>\s*📢 Marketing AI\s*<\/button>)\s*<\/div>/g,
    `$1\n              <button \n                className={\`subtab-btn \${adminSubtab === 'branches' ? 'active' : ''}\`}\n                onClick={() => { setAdminSubtab('branches'); navigate('/admin/branches'); }}\n              >\n                🏢 Chi Nhánh\n              </button>\n            </div>`
  );
}

// 2. Inject branchesMap to AdminDashboard and render AdminBranches
if (!appJsx.includes("branchesMap={branchesMap}")) {
  appJsx = appJsx.replace(
    /(\s*usersCount=\{adminUsersCount\}\s*)\/>\s*\)}/g,
    `$1  branchesMap={branchesMap}\n                />\n              )}\n\n              {adminSubtab === 'branches' && (\n                <AdminBranches \n                  apiFetch={apiFetch}\n                  API_BASE_URL={API_BASE_URL}\n                  fetchBranchesMap={fetchBranchesMap}\n                />\n              )}`
  );
}

// 3. Inject AdminBranches import
if (!appJsx.includes("import AdminBranches")) {
  appJsx = appJsx.replace(
    /(import AdminDashboard from '\.\/components\/Admin\/AdminDashboard';)/,
    `$1\nimport AdminBranches from './components/Admin/AdminBranches';`
  );
}

fs.writeFileSync('frontend/src/App.jsx', appJsx);
console.log('App.jsx restored missing branches logic');
