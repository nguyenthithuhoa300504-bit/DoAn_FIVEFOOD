const fs = require('fs');
const filePath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\components\\Admin\\AdminDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetLine = "border: `1px solid ${themeColors.borderStrong}`,";

if (content.includes("Trung Tâm Tối Ưu Hóa & Đánh Giá FIVEFOOD")) {
    console.log("Already restored!");
    process.exit(0);
}

if (!content.includes(targetLine)) {
    console.log("Cannot find target line!");
    process.exit(1);
}

const insertBlock = `
        boxShadow: themeColors.shadow,
        marginBottom: '32px',
        backdropFilter: 'blur(16px)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '28px', 
            fontWeight: '900',
            background: isDark ? 'linear-gradient(to right, #ffffff, #FFB300)' : 'linear-gradient(to right, #be123c, #FFB300)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Trung Tâm Tối Ưu Hóa & Đánh Giá FIVEFOOD <Sparkles color="#FFB300" size={26} />
          </h1>
          <p style={{ margin: '8px 0 0 0', color: themeColors.textSecondary, fontSize: '15px', fontWeight: '500' }}>
            Hệ thống báo cáo chỉ số BI (Business Intelligence), bám sát vận đơn real-time toàn ranh giới tỉnh & biển đảo.
          </p>
        </div>`;

content = content.replace(targetLine, targetLine + insertBlock);

fs.writeFileSync(filePath, content);
console.log('Restored the missing code block successfully!');
