const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const newLightModeCss = `
/* ========================================================
   GIAO DIỆN LIGHT MODE (SÁNG CÓ ÁNH HỒNG) CHO TOÀN BỘ TRANG ADMIN
   Được kích hoạt thông qua class .light-mode trên admin-theme-wrapper
   ======================================================== */
.admin-theme-wrapper.light-mode {
  background-color: #fff5f8 !important; /* Màu nền trắng ánh hồng nhạt */
  color: #1e293b !important;
}

/* Đảm bảo toàn bộ chữ (kể cả label, span, p) không bị tàng hình */
.admin-theme-wrapper.light-mode h1,
.admin-theme-wrapper.light-mode h2,
.admin-theme-wrapper.light-mode h3,
.admin-theme-wrapper.light-mode h4,
.admin-theme-wrapper.light-mode h5,
.admin-theme-wrapper.light-mode h6,
.admin-theme-wrapper.light-mode p,
.admin-theme-wrapper.light-mode span,
.admin-theme-wrapper.light-mode label,
.admin-theme-wrapper.light-mode div {
  color: #1e293b;
}

/* Header */
.admin-theme-wrapper.light-mode .header-bar {
  background: #ffffff !important;
  border-bottom: 2px solid #fecdd3 !important; /* Viền hồng nhạt */
  box-shadow: 0 4px 15px rgba(255, 192, 203, 0.15) !important;
}

.admin-theme-wrapper.light-mode .logo-text-dark {
  color: #0f172a !important;
}

/* Subtabs (Thanh điều hướng) */
.admin-theme-wrapper.light-mode .admin-subtabs {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(254, 205, 211, 0.5) !important;
  box-shadow: 0 8px 25px rgba(254, 205, 211, 0.2) !important;
}

.admin-theme-wrapper.light-mode .subtab-btn {
  color: #475569 !important;
}
.admin-theme-wrapper.light-mode .subtab-btn:hover {
  background: rgba(254, 205, 211, 0.3) !important; /* Hồng nhạt khi hover */
  color: #0f172a !important;
}

.admin-theme-wrapper.light-mode .subtab-btn.active {
  background: linear-gradient(135deg, #f43f5e 0%, #fb923c 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 15px rgba(244, 63, 94, 0.3) !important;
  border-color: transparent !important;
}
.admin-theme-wrapper.light-mode .subtab-btn.active span {
  color: #ffffff !important;
}

/* Glass Panels & Forms */
.admin-theme-wrapper.light-mode .glass-panel,
.admin-theme-wrapper.light-mode .admin-form-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(254, 205, 211, 0.6) !important;
  box-shadow: 0 8px 30px rgba(254, 205, 211, 0.15) !important;
}

.admin-theme-wrapper.light-mode .form-control,
.admin-theme-wrapper.light-mode select,
.admin-theme-wrapper.light-mode input,
.admin-theme-wrapper.light-mode textarea {
  background: #fff0f5 !important; /* Hồng phấn cực nhạt */
  border: 1px solid rgba(244, 63, 94, 0.2) !important;
  color: #0f172a !important;
}
.admin-theme-wrapper.light-mode .form-control:focus,
.admin-theme-wrapper.light-mode input:focus {
  border-color: #f43f5e !important;
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.2) !important;
}

/* Bảng dữ liệu (Tables) */
.admin-theme-wrapper.light-mode table,
.admin-theme-wrapper.light-mode th,
.admin-theme-wrapper.light-mode td {
  border-color: rgba(254, 205, 211, 0.6) !important;
  color: #1e293b !important;
}

.admin-theme-wrapper.light-mode tr:hover td {
  background: #ffe4e6 !important; /* Hồng nhạt nổi bật khi hover dòng */
  color: #0f172a !important;
}

.admin-theme-wrapper.light-mode .admin-products-table-container {
  background: #ffffff !important;
  border: 1px solid rgba(254, 205, 211, 0.5) !important;
  box-shadow: 0 8px 25px rgba(254, 205, 211, 0.2) !important;
}

.admin-theme-wrapper.light-mode .admin-table th {
  background: #fff5f8 !important;
  color: #be123c !important; /* Đỏ đô/hồng đậm */
  border-bottom: 2px solid rgba(244, 63, 94, 0.3) !important;
}

/* Tiêu đề danh sách */
.admin-theme-wrapper.light-mode .list-header h2 {
  background: linear-gradient(to right, #9f1239, #f43f5e) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

/* Thẻ thống kê (Stat Chips) */
.admin-theme-wrapper.light-mode .admin-stat-chip {
  background: linear-gradient(145deg, #ffffff 0%, #fff5f8 100%) !important;
  border: 1px solid rgba(254, 205, 211, 0.6) !important;
  border-left: 4px solid #f43f5e !important;
  box-shadow: 0 8px 20px rgba(254, 205, 211, 0.2) !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip span {
  color: #64748b !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip h3 {
  color: #0f172a !important;
  text-shadow: none !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip:hover {
  box-shadow: 0 12px 30px rgba(244, 63, 94, 0.2) !important;
  border-color: rgba(244, 63, 94, 0.3) !important;
  border-left-color: #be123c !important;
}
`;

// Xoá cái cũ (nếu vô tình có)
const marker = '/* ========================================================\n   GIAO DIỆN LIGHT MODE (SÁNG CÓ ÁNH HỒNG) CHO TOÀN BỘ TRANG ADMIN';
let finalCss = cssContent;
if (finalCss.includes(marker)) {
  finalCss = finalCss.substring(0, finalCss.indexOf(marker));
}
// Append
fs.writeFileSync(cssPath, finalCss + '\n' + newLightModeCss);
console.log('Appended light mode CSS safely!');
