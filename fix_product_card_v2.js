const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const fixRuleV2 = `
/* --- USER REQUEST: Product card styling overrides V2 --- */
/* Thicker and more visible border */
.dbs-product-card {
  border: 2px solid #cbd5e1 !important; /* Slate 300 - clearly visible */
}

/* Thicker border for dark mode */
body.dark-theme .dbs-product-card {
  border: 2px solid #475569 !important; /* Slate 600 - clearly visible */
}

/* Make product name bigger and bolder */
.dbs-product-name {
  font-size: 16px !important;
  font-weight: 700 !important;
  margin-bottom: 10px !important;
}
`;

fs.writeFileSync(cssPath, cssContent + '\n' + fixRuleV2);
console.log('Appended product card fixes V2 to App.css');
