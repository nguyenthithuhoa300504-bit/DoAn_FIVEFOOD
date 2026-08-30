const fs = require('fs');
const filePath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\components\\Admin\\AdminDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Banner background
content = content.replace(/background:\s*'linear-gradient\(135deg, rgba\(25, 33, 49, 0\.9\) 0%, rgba\(15, 20, 31, 0\.95\) 100%\)'/g, 'background: themeColors.bgBanner');

// KPI Cards background
content = content.replace(/background:\s*'linear-gradient\(145deg, rgba\(28, 35, 51, 0\.9\) 0%, rgba\(18, 22, 34, 0\.95\) 100%\)'/g, 'background: themeColors.bgCard');

// Chart background
content = content.replace(/background:\s*'linear-gradient\(145deg, rgba\(22, 28, 42, 0\.85\) 0%, rgba\(15, 19, 29, 0\.95\) 100%\)'/g, 'background: themeColors.bgChart');

// Map background (if any)
content = content.replace(/background:\s*'linear-gradient\(145deg, rgba\(22, 28, 42, 0\.92\) 0%, rgba\(14, 18, 28, 0\.98\) 100%\)'/g, 'background: themeColors.bgMap');

// Borders
content = content.replace(/border:\s*'1px solid rgba\(255, 255, 255, 0\.1\)'/g, 'border: `1px solid ${themeColors.borderStrong}`');
content = content.replace(/border:\s*'1px solid rgba\(255, 255, 255, 0\.08\)'/g, 'border: `1px solid ${themeColors.border}`');

// Shadows
content = content.replace(/boxShadow:\s*'0 12px 35px rgba\(0, 0, 0, 0\.45\)'/g, 'boxShadow: themeColors.shadow');
content = content.replace(/boxShadow:\s*'0 10px 25px rgba\(0,0,0,0\.35\)'/g, 'boxShadow: themeColors.shadow');

fs.writeFileSync(filePath, content);
console.log('AdminDashboard colors fixed!');
