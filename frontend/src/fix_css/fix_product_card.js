const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const fixRule = `
/* --- USER REQUEST: Product card styling overrides --- */
/* Thicker border for light mode */
.dbs-product-card {
  border: 1.5px solid rgba(0, 0, 0, 0.15) !important;
}

/* Thicker border for dark mode */
body.dark-theme .dbs-product-card {
  border: 1.5px solid rgba(255, 255, 255, 0.25) !important;
}

/* Move name to the left */
.dbs-product-name {
  text-align: left !important;
}

/* Move rating to the left (it's the 2nd child in .dbs-product-info) */
.dbs-product-info > div:nth-child(2) {
  justify-content: flex-start !important;
}

/* Move price to the left */
.dbs-price-row {
  align-items: flex-start !important;
}
`;

fs.writeFileSync(cssPath, cssContent + '\n' + fixRule);
console.log('Appended product card fixes to App.css');
