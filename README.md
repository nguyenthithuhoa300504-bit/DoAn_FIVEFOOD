# FIVEFOOD - HỆ THỐNG ĐẶT VÀ GIAO ĐỒ ĂN TRỰC TUYẾN

Dự án FIVEFOOD được xây dựng trên kiến trúc phân tầng tách biệt (Decoupled Architecture) với **ReactJS (Vite)** ở giao diện người dùng và **NestJS** làm dịch vụ API trung tâm, kết nối cơ sở dữ liệu **Microsoft SQL Server 2022**.

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN
```text
DoAn/
├── database/
│   └── schema.sql       # Script khởi tạo 15 bảng, triggers, procedures trong SQL Server
├── backend/             # Mã nguồn dịch vụ API (NestJS)
│   ├── src/             # Thư mục src của NestJS
│   ├── .env             # File cấu hình kết nối CSDL và các API keys nhạy cảm
│   └── package.json     # Các package phụ thuộc backend
└── frontend/            # Mã nguồn giao diện client (ReactJS + Vite)
    ├── src/             # Mã nguồn ReactJS
    └── package.json     # Các package phụ thuộc frontend
```

---

## 🛠 YÊU CẦU HỆ THỐNG TRƯỚC KHI CÀI ĐẶT
1.  **Node.js** (Phiên bản v18 trở lên).
2.  **Microsoft SQL Server 2022** (Đã kích hoạt cổng mặc định `1433` và tài khoản `sa`).
3.  **SQL Server Management Studio (SSMS)** hoặc công cụ quản trị SQL tương đương.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY TỪNG THÀNH PHẦN

### Bước 1: Khởi tạo Cơ sở dữ liệu (Database)
1.  Mở phần mềm **SSMS** và kết nối vào SQL Server local của bạn.
2.  Mở file SQL tại đường dẫn: `database/schema.sql`.
3.  Nhấn nút **Execute (F5)** để chạy toàn bộ file script. 
    *   *Script sẽ tự động tạo cơ sở dữ liệu tên là `DOAN_H` cùng với các bảng, trigger, stored procedure.*

---

### Bước 2: Cài đặt và chạy Backend (NestJS)
1.  Mở một cửa sổ Terminal mới tại thư mục `backend/` của dự án.
2.  **Cài đặt các gói thư viện phụ thuộc:**
    ```bash
    npm install
    ```
3.  **Cấu hình biến môi trường:**
    *   Mở file `backend/.env` bằng trình chỉnh sửa code của bạn.
    *   Cập nhật mật khẩu tài khoản SQL Server của bạn tại dòng `DB_PASSWORD=your_password_here`.
    *   Nếu có Gemini API Key, điền vào dòng `GEMINI_API_KEY=...`.
4.  **Chạy server ở chế độ phát triển (Hot-reload):**
    ```bash
    npm run start:dev
    ```
    *   *Server sẽ chạy tại địa chỉ mặc định:* `http://localhost:3000/api`

---

### Bước 3: Cài đặt và chạy Frontend (ReactJS + Vite)
1.  Mở một cửa sổ Terminal mới tại thư mục `frontend/` của dự án.
2.  **Cài đặt các gói thư viện phụ thuộc:**
    ```bash
    npm install
    ```
3.  **Chạy client React ở chế độ phát triển:**
    ```bash
    npm run dev
    ```
    *   *Giao diện Web React sẽ chạy tại địa chỉ:* `http://localhost:5173`

---

## 📜 CÁC APIs ĐÃ ĐƯỢC XÂY DỰNG XONG (BACKEND)

### 1. Phân hệ Xác thực (`/api/auth`)
*   `POST /api/auth/register` : Đăng ký tài khoản Khách hàng mới (mật khẩu được mã hóa bcrypt).
*   `POST /api/auth/login` : Đăng nhập và nhận về chuỗi JWT Token.
*   `GET /api/auth/profile` : Xem thông tin cá nhân của token đang đăng nhập (Yêu cầu đính kèm JWT Bearer Token).

### 2. Phân hệ Thực đơn & Danh mục (`/api/products` & `/api/categories`)
*   `GET /api/categories` : Lấy danh sách danh mục (Công khai).
*   `GET /api/products` : Lấy danh sách món ăn hoạt động (Công khai, hỗ trợ tìm kiếm `search`, lọc danh mục `categoryId`, phân trang `page`/`limit`).
*   `GET /api/products/:id` : Chi tiết món ăn (Công khai).
*   `POST /api/products` & `PUT /api/products/:id` : Tạo/Cập nhật món ăn (Yêu cầu quyền Admin).
*   `PUT /api/products/:id/status` : Đóng/Mở trạng thái bán của món ăn (Yêu cầu quyền Admin).
*   `GET /api/products/:id/history` : Xem lịch sử thay đổi giá/tồn kho của món ăn từ Temporal Table (Yêu cầu quyền Admin).
