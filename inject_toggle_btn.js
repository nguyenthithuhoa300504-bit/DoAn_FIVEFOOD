const fs = require('fs');
const appPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');

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

if (!appContent.includes('title="Chuyển Giao diện Sáng/Tối"')) {
  appContent = appContent.replace(
    /<div className="header-actions".*?>/,
    (match) => match + '\n' + toggleBtnHtml
  );
  fs.writeFileSync(appPath, appContent);
  console.log("Injected toggle button successfully!");
} else {
  console.log("Toggle button already exists!");
}
