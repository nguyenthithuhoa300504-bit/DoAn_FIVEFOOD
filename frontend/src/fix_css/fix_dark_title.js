const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const fixRule = `
/* Global protect gradient titles from color overrides (Dark & Light) */
.dashboard-main-title,
*:hover > .dashboard-main-title {
  color: transparent !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
}
`;

if (!cssContent.includes('.dashboard-main-title {')) {
  fs.writeFileSync(cssPath, cssContent + fixRule);
  console.log('Appended global dashboard-main-title fix!');
} else {
  console.log('Fix already exists!');
}
