const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

// The block to replace
const oldHoverBlock = `.admin-theme-wrapper.light-mode tr:hover td {
  background: #fff0f5 !important; 
  transform: scale(1.002);
}`;

const newHoverBlock = `.admin-theme-wrapper.light-mode tr:hover td {
  background: #fff0f5 !important; 
  transform: scale(1.002);
  color: #1e293b !important;
}

.admin-theme-wrapper.light-mode tr:hover td * {
  color: #1e293b !important;
}

.admin-theme-wrapper.light-mode tr:hover td .btn-primary,
.admin-theme-wrapper.light-mode tr:hover td .btn-primary span,
.admin-theme-wrapper.light-mode tr:hover td .btn-checkout,
.admin-theme-wrapper.light-mode tr:hover td .badge,
.admin-theme-wrapper.light-mode tr:hover td .badge span {
  color: #ffffff !important;
}`;

if (cssContent.includes(oldHoverBlock)) {
  cssContent = cssContent.replace(oldHoverBlock, newHoverBlock);
  fs.writeFileSync(cssPath, cssContent);
  console.log('Hover text color fixed!');
} else {
  // If exact match fails, let's just append it strongly
  fs.writeFileSync(cssPath, cssContent + '\\n' + newHoverBlock);
  console.log('Appended hover text color fix!');
}
