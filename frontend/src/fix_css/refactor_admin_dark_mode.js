const fs = require('fs');

const filePath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\components\\Admin\\AdminDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Sun, Moon to lucide-react imports
content = content.replace(
  "import { MapPin, TrendingUp, Users, Package, Utensils, ShieldCheck, Calendar, Sparkles, Activity, Globe, BarChart2, PieChart as PieIcon, CheckCircle2, AlertCircle } from 'lucide-react';",
  "import { MapPin, TrendingUp, Users, Package, Utensils, ShieldCheck, Calendar, Sparkles, Activity, Globe, BarChart2, PieChart as PieIcon, CheckCircle2, AlertCircle, Sun, Moon } from 'lucide-react';"
);

// 2. Add theme state and themeColors to AdminDashboard component
const themeStateCode = `  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') || 'dark');
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('admin_theme', newTheme);
  };

  const themeColors = {
    textMain: isDark ? '#e2e8f0' : '#1e293b',
    textPrimary: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    bgBanner: isDark ? 'linear-gradient(135deg, rgba(25, 33, 49, 0.9) 0%, rgba(15, 20, 31, 0.95) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    bgCard: isDark ? 'linear-gradient(145deg, rgba(28, 35, 51, 0.9) 0%, rgba(18, 22, 34, 0.95) 100%)' : '#ffffff',
    bgChart: isDark ? 'linear-gradient(145deg, rgba(22, 28, 42, 0.85) 0%, rgba(15, 19, 29, 0.95) 100%)' : '#ffffff',
    bgMap: isDark ? 'linear-gradient(145deg, rgba(22, 28, 42, 0.92) 0%, rgba(14, 18, 28, 0.98) 100%)' : '#ffffff',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    borderStrong: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)',
    shadow: isDark ? '0 10px 25px rgba(0,0,0,0.35)' : '0 10px 25px rgba(0,0,0,0.05)',
    gridLine: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    tooltipBg: isDark ? 'rgba(15, 20, 32, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipColor: isDark ? '#fff' : '#0f172a',
    mapTiles: isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  };

`;

content = content.replace(
  "const [lastUpdated, setLastUpdated] = useState(new Date());",
  "const [lastUpdated, setLastUpdated] = useState(new Date());\n" + themeStateCode
);

// 3. Update Leaflet Map initialization to use themeColors
content = content.replace(
  "L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {",
  "mapInstance.current.tileLayer = L.tileLayer(themeColors.mapTiles, {"
);

const useEffectMapTiles = `
  useEffect(() => {
    if (mapInstance.current && mapInstance.current.tileLayer) {
      mapInstance.current.tileLayer.setUrl(themeColors.mapTiles);
    }
  }, [themeColors.mapTiles]);
`;

content = content.replace(
  "return (",
  useEffectMapTiles + "\n  return ("
);


// 4. Header Toggle Button
const headerToggleBtn = `
          <button onClick={toggleTheme} style={{
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: '1px solid ' + themeColors.border,
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: themeColors.textPrimary,
            transition: 'all 0.3s'
          }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
`;

content = content.replace(
  "          <div style={{ \n            padding: '8px 16px', \n            background: 'rgba(16, 185, 129, 0.15)',",
  headerToggleBtn + "\n          <div style={{ \n            padding: '8px 16px', \n            background: 'rgba(16, 185, 129, 0.15)',"
);

// 5. Replace inline styles with themeColors
content = content.replace(/color: '#e2e8f0'/g, "color: themeColors.textMain");
content = content.replace(/background: 'linear-gradient\\(135deg, rgba\\(25, 33, 49, 0\\.9\\) 0%, rgba\\(15, 20, 31, 0\\.95\\) 100%\\)'/g, "background: themeColors.bgBanner");
content = content.replace(/border: '1px solid rgba\\(255, 255, 255, 0\\.1\\)'/g, "border: `1px solid ${themeColors.borderStrong}`");
content = content.replace(/color: '#94a3b8'/g, "color: themeColors.textSecondary");
content = content.replace(/background: 'linear-gradient\\(145deg, rgba\\(28, 35, 51, 0\\.9\\) 0%, rgba\\(18, 22, 34, 0\\.95\\) 100%\\)'/g, "background: themeColors.bgCard");
content = content.replace(/border: '1px solid rgba\\(255, 255, 255, 0\\.08\\)'/g, "border: `1px solid ${themeColors.border}`");
content = content.replace(/color: '#ffffff'/g, "color: themeColors.textPrimary");
content = content.replace(/color: '#f8fafc'/g, "color: themeColors.textPrimary");
content = content.replace(/boxShadow: '0 10px 25px rgba\\(0,0,0,0\\.35\\)'/g, "boxShadow: themeColors.shadow");
content = content.replace(/boxShadow: '0 12px 30px rgba\\(0,0,0,0\\.4\\)'/g, "boxShadow: themeColors.shadow");
content = content.replace(/boxShadow: '0 15px 40px rgba\\(0,0,0,0\\.55\\)'/g, "boxShadow: themeColors.shadow");

content = content.replace(/background: 'linear-gradient\\(145deg, rgba\\(22, 28, 42, 0\\.85\\) 0%, rgba\\(15, 19, 29, 0\\.95\\) 100%\\)'/g, "background: themeColors.bgChart");
content = content.replace(/background: 'linear-gradient\\(145deg, rgba\\(22, 28, 42, 0\\.92\\) 0%, rgba\\(14, 18, 28, 0\\.98\\) 100%\\)'/g, "background: themeColors.bgMap");
content = content.replace(/stroke="rgba\\(255,255,255,0\\.06\\)"/g, "stroke={themeColors.gridLine}");
content = content.replace(/backgroundColor: 'rgba\\(15, 20, 32, 0\\.95\\)'/g, "backgroundColor: themeColors.tooltipBg");
content = content.replace(/color: '#fff'/g, "color: themeColors.tooltipColor");


// Dynamic classes for CSS hover effects
content = content.replace(/<div className="admin-dashboard fade-in"/g, "<div className={`admin-dashboard fade-in ${isDark ? 'dark-mode' : 'light-mode'}`}");

// Ensure hover styles in the inline style block are updated correctly based on mode
content = content.replace(
  /(\.kpi-card:hover \{[\s\S]*?\})/,
  ".kpi-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important; border-color: rgba(255, 179, 0, 0.5) !important; }\n        .dark-mode .kpi-card:hover { box-shadow: 0 20px 40px rgba(0, 0, 0, 0.65) !important; }"
);
content = content.replace(
  /(\.chart-card:hover \{[\s\S]*?\})/,
  ".chart-card:hover { border-color: rgba(0, 0, 0, 0.1) !important; box-shadow: 0 18px 45px rgba(0, 0, 0, 0.1) !important; }\n        .dark-mode .chart-card:hover { border-color: rgba(255, 255, 255, 0.18) !important; box-shadow: 0 18px 45px rgba(0, 0, 0, 0.55) !important; }"
);
content = content.replace(
  /\.leaflet-container \{[\s\S]*?background-color: #080b11 !important;[\s\S]*?\}/,
  ".leaflet-container { font-family: 'Inter', system-ui, sans-serif !important; }\n        .dark-mode .leaflet-container { background-color: #080b11 !important; }\n        .light-mode .leaflet-container { background-color: #f8fafc !important; }"
);


fs.writeFileSync(filePath, content);
console.log('Successfully refactored AdminDashboard.jsx for Light/Dark mode.');
