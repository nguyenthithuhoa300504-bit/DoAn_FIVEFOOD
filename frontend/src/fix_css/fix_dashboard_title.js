const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const fixRule = `
/* Protect gradient titles from global hover color resets */
.admin-theme-wrapper.light-mode .dashboard-main-title,
.admin-theme-wrapper.light-mode *:hover > .dashboard-main-title {
  color: transparent !important;
}
`;

if (!cssContent.includes('.dashboard-main-title')) {
  fs.writeFileSync(cssPath, cssContent + fixRule);
  console.log('Appended dashboard-main-title fix!');
} else {
  console.log('Fix already exists!');
}
