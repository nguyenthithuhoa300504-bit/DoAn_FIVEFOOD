const fs = require('fs');

let appJsx = fs.readFileSync('frontend/src/App.jsx', 'utf8');

if (!appJsx.includes("fetchAdminReviews = async (showToast = false)")) {
  appJsx = appJsx.replace(
    /const fetchAdminReviews = async \(\) => \{\s*try \{\s*const data = await apiFetch\(`\$\{API_BASE_URL\}\/reviews\/admin\/all`\);\s*setAdminReviews\(data \|\| \[\]\);/g,
    `const fetchAdminReviews = async (showToast = false) => {\n    try {\n      const data = await apiFetch(\`\${API_BASE_URL}/reviews/admin/all\`);\n      setAdminReviews(data || []);\n      if (showToast) {\n        toast.success('Đã tải lại danh sách đánh giá');\n      }`
  );
}

if (!appJsx.includes("fetchAdminReviews(true)")) {
  appJsx = appJsx.replace(
    /<button className="btn btn-secondary" onClick=\{fetchAdminReviews\}>Làm mới<\/button>/g,
    `<button className="btn btn-secondary" onClick={() => fetchAdminReviews(true)}>🔄 Làm mới</button>`
  );
}

fs.writeFileSync('frontend/src/App.jsx', appJsx);
console.log('Toast restored');
