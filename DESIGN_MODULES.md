# TÀI LIỆU THIẾT KẾ CÁC PHÂN HỆ HỆ THỐNG (DESIGN_MODULES)
## DỰ ÁN: PHÁT TRIỂN ỨNG DỤNG WEB ĐẶT VÀ GIAO ĐỒ ĂN TRỰC TUYẾN FIVEFOOD

Tài liệu này tổng hợp toàn bộ thông tin thiết kế kỹ thuật của **13 phân hệ (modules)** cấu thành nên hệ thống FIVEFOOD. Hệ thống được tối ưu hóa ở mức dữ liệu vật lý với chuẩn xác **12 Bảng (Tables) + 1 View**, đóng vai trò làm tài liệu tham chiếu (documentation) trong quá trình phát triển mã nguồn (Backend NestJS, Database SQL Server 2022, Frontend ReactJS).

---

## CÔNG NGHỆ SỬ DỤNG (TECH STACK)

### 1. Giao diện (Frontend)
*   **Core Framework**: ReactJS khởi tạo dự án bằng **Vite**.
*   **Thiết kế & Giao diện**: TailwindCSS, hiệu ứng Glassmorphism.
*   **Bản đồ số**: **Leaflet** & **React-Leaflet**.
*   **Vẽ Đồ thị & Thống kê**: **Recharts**.
*   **Xử lý Giọng nói**: Tích hợp **Web Speech API** (Native HTML5).
*   **Kết nối Realtime**: **WebSocket (Socket.io)**.

### 2. Dịch vụ API (Backend)
*   **Core Framework**: **NestJS** với Kiến trúc 3 lớp (3-Tier Layered Architecture).
*   **Xác thực & Bảo mật**: **Passport.js** tích hợp **JWT**, mã hóa mật khẩu bằng **bcrypt**.
*   **Tích hợp AI**: Gọi trực tiếp API Groq để tương tác với mô hình **LLaMA-3.1-8B**.
*   **Kết nối Database**: Thư viện mssql (TypeORM).
*   **Tài liệu API Tự động**: Tích hợp **Swagger UI**.

### 3. Hệ quản trị Cơ sở dữ liệu (Database)
*   **Hệ quản trị**: **Microsoft SQL Server 2022**.
*   **Tính năng đặc thù được áp dụng**:
    *   **Temporal Tables (System-Versioned)**: Theo dõi lịch sử giá của món ăn.
    *   **JSON Native Support**: Xử lý dữ liệu hội thoại Chatbot.
    *   **Stored Procedures & Triggers**: Bảo vệ giao dịch (Transactions) và hoàn trả kho.

---

## 1. PHÂN HỆ 1: XÁC THỰC & PHÂN QUYỀN (Auth & Users)

### Tổng quan (Overview)
Phân hệ quản lý định danh người dùng. Để tối ưu CSDL, vai trò người dùng (Admin, Khách hàng, Shipper) được tích hợp thẳng vào bảng `Users` thay vì tách bảng riêng, giảm thiểu phép JOIN.

### A. Database Schema
*   **Bảng 1: `Users`**
    ```sql
    CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Email VARCHAR(100) NOT NULL UNIQUE,
        Phone VARCHAR(15) NULL,
        PasswordHash VARCHAR(255) NOT NULL,
        Role NVARCHAR(20) DEFAULT 'Customer' CHECK (Role IN ('Customer', 'Admin', 'Shipper')),
        IsLocked BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    ```

### B. RESTful API Endpoints
| Method | Endpoint | Quyền truy cập | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản Khách hàng mới |
| `POST` | `/api/auth/login` | Public | Đăng nhập tài khoản, trả về JWT Token |

---

## 2. PHÂN HỆ 2: QUẢN LÝ THỰC ĐƠN & KHO HÀNG (Products & Categories)

### A. Database Schema
*   **Bảng 2: `Categories`**
    ```sql
    CREATE TABLE Categories (
        CategoryID INT IDENTITY(1,1) PRIMARY KEY,
        CategoryName NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255) NULL
    );
    ```
*   **Bảng 3: `Products` (System-Versioned Temporal Table)**
    ```sql
    CREATE TABLE Products (
        ProductID INT IDENTITY(1,1) PRIMARY KEY,
        ProductName NVARCHAR(150) NOT NULL,
        CategoryID INT NOT NULL,
        Price DECIMAL(18,2) NOT NULL,
        Inventory INT NOT NULL DEFAULT 0,
        ImageURL VARCHAR(255) NULL,
        IsActive BIT DEFAULT 1,
        SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
        SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
        PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime),
        CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
    )
    WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.ProductsHistory));
    ```

---

## 3. PHÂN HỆ 3: GIỎ HÀNG HỖN HỢP (Hybrid Cart)

### Tổng quan
Giỏ hàng lưu trữ LocalStorage khi chưa đăng nhập, đồng bộ lên CSDL khi đăng nhập.
### A. Database Schema
*   **Bảng 4: `CartItems`**
    ```sql
    CREATE TABLE CartItems (
        CartItemID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ProductID INT NOT NULL,
        Quantity INT NOT NULL CHECK (Quantity > 0),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_CartItems_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_CartItems_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
        CONSTRAINT UQ_User_Product_Cart UNIQUE (UserID, ProductID)
    );
    ```

---

## 4. PHÂN HỆ 4: ĐẶT HÀNG & KHUYẾN MÃI (Orders & Vouchers)

### Tổng quan
Nghiệp vụ cốt lõi, xử lý mã giảm giá (Vouchers) và Đơn hàng. Đơn hàng được gán trực tiếp cho `ShipperID` (là người dùng có Role = 'Shipper') để tối ưu số lượng bảng CSDL.

### A. Database Schema
*   **Bảng 5: `Vouchers`**
    ```sql
    CREATE TABLE Vouchers (
        VoucherID INT IDENTITY(1,1) PRIMARY KEY,
        Code VARCHAR(50) NOT NULL UNIQUE,
        DiscountPercentage INT NOT NULL CHECK (DiscountPercentage BETWEEN 1 AND 100),
        MaxDiscountAmount DECIMAL(18,2) NOT NULL,
        MinOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        UsageLimit INT NOT NULL,
        UsedCount INT DEFAULT 0,
        EndDate DATETIME NOT NULL
    );
    ```
*   **Bảng 6: `Orders`**
    ```sql
    CREATE TABLE Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ShipperID INT NULL, -- Gán cho Shipper
        OrderDate DATETIME DEFAULT GETDATE(),
        TotalAmount DECIMAL(18,2) NOT NULL,
        FinalAmount DECIMAL(18,2) NOT NULL,
        VoucherID INT NULL,
        Status NVARCHAR(50) DEFAULT N'Chờ xác nhận',
        ShippingAddress NVARCHAR(255) NOT NULL,
        Latitude DECIMAL(9,6) NULL,
        Longitude DECIMAL(9,6) NULL,
        CONSTRAINT FK_Orders_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Orders_Shippers FOREIGN KEY (ShipperID) REFERENCES Users(UserID),
        CONSTRAINT FK_Orders_Vouchers FOREIGN KEY (VoucherID) REFERENCES Vouchers(VoucherID)
    );
    ```
*   **Bảng 7: `OrderDetails` (Thực thể chen)**
    ```sql
    CREATE TABLE OrderDetails (
        OrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        ProductID INT NOT NULL,
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(18,2) NOT NULL,
        CONSTRAINT FK_OrderDetails_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
        CONSTRAINT FK_OrderDetails_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
    );
    ```

---

## 5. PHÂN HỆ 5: TÍCH HỢP CỔNG THANH TOÁN (VNPay Sandbox)

### A. Database Schema
*   **Bảng 8: `Transactions`**
    ```sql
    CREATE TABLE Transactions (
        TransactionID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        TransactionNo VARCHAR(100) NOT NULL UNIQUE,
        Amount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Transactions_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    );
    ```

---

## 6. PHÂN HỆ 6: VẬN CHUYỂN & BẢN ĐỒ SỐ (Delivery & Leaflet Map)

### Tổng quan
Để giữ hệ thống gọn gàng ở mức 12 bảng, tiến trình vận chuyển không lưu vào CSDL mà truyền tải tọa độ GPS theo thời gian thực 100% qua luồng **WebSockets** giữa Shipper và Khách hàng trên nền tảng Leaflet Map. Trạng thái giao hàng được cập nhật trực tiếp vào cột `Status` của bảng `Orders`.

---

## 7. PHÂN HỆ 7: TRỢ LÝ AI CHATBOT (AI Chatbot & Groq LLM)

### A. Database Schema
*   **Bảng 9: `ChatbotLogs`**
    ```sql
    CREATE TABLE ChatbotLogs (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NULL,
        SessionID VARCHAR(100) NOT NULL,
        ConversationData NVARCHAR(MAX) NOT NULL, -- Dữ liệu JSON cuộc trò chuyện
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ChatbotLogs_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
    );
    ```

---

## 8. PHÂN HỆ 8: ĐÁNH GIÁ & YÊU THÍCH (Reviews & Favorites)

### A. Database Schema
*   **Bảng 10: `Favorites`**
    ```sql
    CREATE TABLE Favorites (
        FavoriteID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ProductID INT NOT NULL,
        CONSTRAINT FK_Favorites_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Favorites_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
        CONSTRAINT UQ_User_Product_Fav UNIQUE (UserID, ProductID)
    );
    ```
*   **Bảng 11: `Reviews`**
    ```sql
    CREATE TABLE Reviews (
        ReviewID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ProductID INT NOT NULL,
        OrderID INT NOT NULL,
        Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
        Comment NVARCHAR(MAX) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Reviews_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Reviews_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
        CONSTRAINT FK_Reviews_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    );
    ```

---

## 9. PHÂN HỆ 9: THÔNG BÁO CHAT REALTIME (Socket.io Gateway)
### Tổng quan
Sử dụng In-memory Storage (Lưu trữ trên RAM) của NestJS và Socket.io để đẩy thông báo trạng thái đơn hàng (Push Notifications) và tin nhắn hỗ trợ mà không cần ghi xuống CSDL, đảm bảo tối ưu hiệu năng và không phát sinh bảng rác.

---

## 10. PHÂN HỆ 10: THEO DÕI HÀNH VI & GỢI Ý NÂNG CAO
### Tổng quan
Thay vì tạo thêm bảng log làm phình CSDL, Thuật toán Gợi ý (Recommendations) sẽ tận dụng trực tiếp dữ liệu từ 3 bảng `Orders`, `OrderDetails` và `Favorites` để xây dựng View `vw_DailyRevenue` và truy vấn trực tiếp.

### A. Database View
*   **View 1: `vw_DailyRevenue` (Tái sử dụng cho thống kê doanh thu)**

---

## 11. PHÂN HỆ 11: MARKETING, TĂNG TRƯỞNG & TƯƠNG TÁC
### Tổng quan
Triển khai hoàn toàn ở tầng Frontend ReactJS:
1. **Hiệu ứng FOMO**: Các Popup thông báo mua hàng ảo tuần hoàn.
2. **Cross-sell**: Băng chuyền gợi ý đồ uống/ăn vặt tại Giỏ hàng.
3. **Zalo Widget**: Nút liên kết mở khung chat Zalo.

---

## 12. PHÂN HỆ 12: QUẢN LÝ CHI NHÁNH (Branches)

### A. Database Schema
*   **Bảng 12: `Branches`**
    ```sql
    CREATE TABLE Branches (
        BranchID INT IDENTITY(1,1) PRIMARY KEY,
        BranchName NVARCHAR(150) NOT NULL UNIQUE,
        Latitude DECIMAL(9,6) NOT NULL,
        Longitude DECIMAL(9,6) NOT NULL,
        Address NVARCHAR(255) NULL,
        IsActive BIT DEFAULT 1
    );
    ```

---

## 13. PHÂN HỆ 13: QUẢN TRỊ TRUNG TÂM (Admin Dashboard)
Tích hợp Recharts vẽ biểu đồ từ View Doanh thu, xuất dữ liệu ra file Excel (.csv) và cung cấp tài liệu API tự động qua Swagger UI.
