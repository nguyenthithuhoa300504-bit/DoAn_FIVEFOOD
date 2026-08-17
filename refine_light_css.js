const fs = require('fs');
const cssPath = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Thay thế đoạn CSS cũ bằng đoạn CSS mới hoàn thiện hơn
const marker = '/* ========================================================\n   GIAO DIỆN LIGHT MODE (SÁNG CÓ ÁNH HỒNG) CHO TOÀN BỘ TRANG ADMIN';
if (cssContent.includes(marker)) {
  cssContent = cssContent.substring(0, cssContent.indexOf(marker));
}

const refinedLightModeCss = `
/* ========================================================
   GIAO DIỆN LIGHT MODE (SÁNG CÓ ÁNH HỒNG) CHO TOÀN BỘ TRANG ADMIN
   ======================================================== */
.admin-theme-wrapper.light-mode {
  background-color: #fff5f8 !important; 
  color: #1e293b !important;
}

/* FIX LỖI TÀNG HÌNH CHỮ: Đảm bảo toàn bộ chữ đều dùng màu đen nhạt */
.admin-theme-wrapper.light-mode *,
.admin-theme-wrapper.light-mode h1,
.admin-theme-wrapper.light-mode h2,
.admin-theme-wrapper.light-mode h3,
.admin-theme-wrapper.light-mode h4,
.admin-theme-wrapper.light-mode h5,
.admin-theme-wrapper.light-mode h6,
.admin-theme-wrapper.light-mode p,
.admin-theme-wrapper.light-mode span,
.admin-theme-wrapper.light-mode label,
.admin-theme-wrapper.light-mode div,
.admin-theme-wrapper.light-mode strong,
.admin-theme-wrapper.light-mode b,
.admin-theme-wrapper.light-mode i,
.admin-theme-wrapper.light-mode td {
  color: #1e293b !important;
}

/* Các trường hợp ngoại lệ cần giữ nguyên màu trắng hoặc gradient */
.admin-theme-wrapper.light-mode .subtab-btn.active,
.admin-theme-wrapper.light-mode .subtab-btn.active span,
.admin-theme-wrapper.light-mode .subtab-btn.active i,
.admin-theme-wrapper.light-mode .btn-primary,
.admin-theme-wrapper.light-mode .btn-primary span,
.admin-theme-wrapper.light-mode .btn-checkout,
.admin-theme-wrapper.light-mode .badge,
.admin-theme-wrapper.light-mode .badge span {
  color: #ffffff !important;
}

.admin-theme-wrapper.light-mode .list-header h2,
.admin-theme-wrapper.light-mode .list-header h2 span {
  background: linear-gradient(to right, #9f1239, #f43f5e) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: transparent !important;
}

/* Header */
.admin-theme-wrapper.light-mode .header-bar {
  background: #ffffff !important;
  border-bottom: 2px solid #fecdd3 !important; 
  box-shadow: 0 4px 15px rgba(255, 192, 203, 0.25) !important;
}

/* Subtabs (Thanh điều hướng) */
.admin-theme-wrapper.light-mode .admin-subtabs {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(254, 205, 211, 0.8) !important;
  box-shadow: 0 10px 30px rgba(254, 205, 211, 0.25) !important;
}

.admin-theme-wrapper.light-mode .subtab-btn {
  background: transparent !important;
  border: 1px solid transparent !important;
}

.admin-theme-wrapper.light-mode .subtab-btn:hover {
  background: #ffe4e6 !important; 
}

.admin-theme-wrapper.light-mode .subtab-btn.active {
  background: linear-gradient(135deg, #f43f5e 0%, #fb923c 100%) !important;
  box-shadow: 0 6px 20px rgba(244, 63, 94, 0.35) !important;
}

/* Glass Panels & Forms */
.admin-theme-wrapper.light-mode .glass-panel,
.admin-theme-wrapper.light-mode .admin-form-card {
  background: #ffffff !important;
  border: 1px solid rgba(254, 205, 211, 0.8) !important;
  box-shadow: 0 12px 35px rgba(254, 205, 211, 0.2) !important;
  border-radius: 20px !important;
}

.admin-theme-wrapper.light-mode .form-control,
.admin-theme-wrapper.light-mode select,
.admin-theme-wrapper.light-mode input,
.admin-theme-wrapper.light-mode textarea {
  background: #fff0f5 !important; 
  border: 1px solid rgba(244, 63, 94, 0.3) !important;
  border-radius: 12px !important;
}
.admin-theme-wrapper.light-mode .form-control:focus,
.admin-theme-wrapper.light-mode input:focus {
  border-color: #f43f5e !important;
  box-shadow: 0 0 12px rgba(244, 63, 94, 0.25) !important;
  background: #ffffff !important;
}

/* KHUNG BẢNG BIỂU (Tâm điểm bắt mắt) */
.admin-theme-wrapper.light-mode .admin-products-table-container,
.admin-theme-wrapper.light-mode .admin-table-container {
  background: #ffffff !important;
  border: 1px solid rgba(254, 205, 211, 0.8) !important;
  box-shadow: 0 15px 40px rgba(254, 205, 211, 0.25) !important;
  border-radius: 20px !important;
  overflow: hidden !important;
}

.admin-theme-wrapper.light-mode table {
  border-collapse: separate !important;
  border-spacing: 0 !important;
  width: 100% !important;
}

.admin-theme-wrapper.light-mode th {
  background: linear-gradient(90deg, #fff5f8 0%, #ffe4e6 100%) !important;
  color: #9f1239 !important; 
  border-bottom: 2px solid rgba(244, 63, 94, 0.4) !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  padding: 16px 22px !important;
}

.admin-theme-wrapper.light-mode td {
  border-bottom: 1px solid rgba(254, 205, 211, 0.5) !important;
  padding: 18px 22px !important;
  background: #ffffff !important;
  transition: all 0.3s ease !important;
}

.admin-theme-wrapper.light-mode tr:hover td {
  background: #fff0f5 !important; 
  transform: scale(1.002);
}

/* Thẻ thống kê (Stat Chips) */
.admin-theme-wrapper.light-mode .admin-stat-chip {
  background: linear-gradient(145deg, #ffffff 0%, #fff5f8 100%) !important;
  border: 1px solid rgba(254, 205, 211, 0.8) !important;
  border-left: 5px solid #f43f5e !important;
  box-shadow: 0 10px 25px rgba(254, 205, 211, 0.25) !important;
  border-radius: 18px !important;
  transition: all 0.3s ease !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 15px 35px rgba(244, 63, 94, 0.3) !important;
  border-color: rgba(244, 63, 94, 0.5) !important;
  border-left-color: #be123c !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip span {
  color: #64748b !important;
  font-weight: 700 !important;
}

.admin-theme-wrapper.light-mode .admin-stat-chip h3 {
  color: #0f172a !important;
}

/* Fix Status badges colors to pop up in light mode */
.admin-theme-wrapper.light-mode .status-badge,
.admin-theme-wrapper.light-mode .badge {
  box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important;
}
`;

fs.writeFileSync(cssPath, cssContent + '\n' + refinedLightModeCss);
console.log('Refined CSS Light Mode successfully!');
