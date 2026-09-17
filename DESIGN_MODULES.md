# TÀI LIỆU THIẾT KẾ CÁC PHÂN HỆ HỆ THỐNG (DESIGN_MODULES)
## DỰ ÁN: PHÁT TRIỂN ỨNG DỤNG WEB ĐẶT VÀ GIAO ĐỒ ĂN TRỰC TUYẾN FIVEFOOD

Tài liệu này tổng hợp toàn bộ thông tin thiết kế kỹ thuật của **13 phân hệ (modules)** cấu thành nên hệ thống FIVEFOOD, đóng vai trò làm tài liệu tham chiếu (documentation) trong quá trình phát triển mã nguồn (Backend NestJS, Database SQL Server 2022, Frontend ReactJS). Hệ thống được thiết kế mở rộng với **18 Bảng vật lý (Tables) + 1 Bảng Lịch sử + 2 Views**.

---

## CÔNG NGHỆ SỬ DỤNG (TECH STACK)

### 1. Giao diện (Frontend)
*   **Core Framework**: ReactJS (phiên bản 18 trở lên) khởi tạo dự án cực nhanh bằng **Vite**.
*   **Thiết kế & Giao diện**: TailwindCSS, sử dụng font chữ hiện đại, hiệu ứng Glassmorphism.
*   **Bản đồ số**: **Leaflet** & **React-Leaflet** tích hợp bản đồ OpenStreetMap.
*   **Vẽ Đồ thị & Thống kê**: **Recharts**.
*   **Xử lý Giọng nói**: Tích hợp **Web Speech API** (Native HTML5) cho Chatbot.
*   **Kết nối Realtime**: **WebSocket (Socket.io)**.

### 2. Dịch vụ API (Backend)
*   **Core Framework**: **NestJS** với cấu trúc 3 lớp (3-Tier Architecture).
*   **Xác thực & Bảo mật**: **Passport.js** tích hợp **JWT**, mã hóa mật khẩu bằng **bcrypt**.
*   **Tích hợp AI**: Gọi trực tiếp API DeepSeek (sử dụng mô hình DeepSeek Chat).
*   **Kết nối Database**: Thư viện mssql (TypeORM).
*   **Tài liệu API Tự động**: **Swagger UI**.

### 3. Hệ quản trị Cơ sở dữ liệu (Database)
*   **Hệ quản trị**: **Microsoft SQL Server 2022**.
*   **Tính năng đặc thù được áp dụng**:
    *   **Temporal Tables (System-Versioned)**: Theo dõi lịch sử giá của món ăn.
    *   **JSON Native Support**: Xử lý JSON cho hội thoại Chatbot.
    *   **Stored Procedures & Triggers**: Giao dịch (Transactions) đặt hàng.

---

## 1. PHÂN HỆ 1: XÁC THỰC & PHÂN QUYỀN (Auth & Users)

### Tổng quan
Quản lý định danh người dùng. Phân quyền linh hoạt giữa Admin, Khách hàng và Shipper thông qua bảng `Roles`.

### A. Database Schema
*   **Bảng 1: `Roles`**
    ```sql
    CREATE TABLE Roles (
        RoleID INT IDENTITY(1,1) PRIMARY KEY,
        RoleName NVARCHAR(50) NOT NULL UNIQUE
    );
    ```
*   **Bảng 2: `Users`**
    ```sql
    CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Email VARCHAR(100) NOT NULL UNIQUE,
        Phone VARCHAR(15) NULL,
        PasswordHash VARCHAR(255) NOT NULL,
        RoleID INT NOT NULL,
        IsLocked BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
    );
    ```

---

## 2. PHÂN HỆ 2: QUẢN LÝ THỰC ĐƠN & KHO HÀNG (Products & Categories)

### A. Database Schema
*   **Bảng 3: `Categories`**
    ```sql
    CREATE TABLE Categories (
        CategoryID INT IDENTITY(1,1) PRIMARY KEY,
        CategoryName NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255) NULL
    );
    ```
*   **Bảng 4: `Products` (System-Versioned Temporal Table)**
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
    WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.ProductsHist));
    ```

---

## 3. PHÂN HỆ 3: GIỎ HÀNG HỖN HỢP (Hybrid Cart)

### A. Database Schema
*   **Bảng 5: `CartItems`**
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

## 4. PHÂN HỆ 4: ĐẶT HÀNG & KHUYẾN MÃI (Orders & Promotions)

### A. Database Schema
*   **Bảng 6: `Promotions`**
    ```sql
    CREATE TABLE Promotions (
        PromotionID INT IDENTITY(1,1) PRIMARY KEY,
        PromoCode VARCHAR(50) NOT NULL UNIQUE,
        Description NVARCHAR(255) NULL,
        DiscountPercentage INT NOT NULL CHECK (DiscountPercentage BETWEEN 1 AND 100),
        MaxDiscountAmount DECIMAL(18,2) NOT NULL,
        MinOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        UsageLimit INT NOT NULL,
        UsedCount INT DEFAULT 0,
        StartDate DATETIME NOT NULL,
        EndDate DATETIME NOT NULL
    );
    ```
*   **Bảng 7: `Orders`**
    ```sql
    CREATE TABLE Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        OrderDate DATETIME DEFAULT GETDATE(),
        TotalAmount DECIMAL(18,2) NOT NULL,
        DiscountAmount DECIMAL(18,2) DEFAULT 0,
        FinalAmount DECIMAL(18,2) NOT NULL,
        PromotionID INT NULL,
        Status NVARCHAR(50) DEFAULT N'Chờ xác nhận',
        ShippingAddress NVARCHAR(255) NOT NULL,
        Latitude DECIMAL(9,6) NULL,
        Longitude DECIMAL(9,6) NULL,
        PaymentMethod NVARCHAR(50) NOT NULL,
        PaymentStatus NVARCHAR(50) DEFAULT N'Chưa thanh toán',
        CONSTRAINT FK_Orders_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Orders_Promotions FOREIGN KEY (PromotionID) REFERENCES Promotions(PromotionID)
    );
    ```
*   **Bảng 8: `OrderDetails`**
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
*   **Bảng 9: `Transactions`**
    ```sql
    CREATE TABLE Transactions (
        TransactionID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        PaymentGateway NVARCHAR(50) NOT NULL,
        TransactionNo VARCHAR(100) NOT NULL UNIQUE,
        Amount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(50) NOT NULL,
        ResponseCode VARCHAR(10) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Transactions_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    );
    ```

---

## 6. PHÂN HỆ 6: VẬN CHUYỂN & BẢN ĐỒ SỐ (Delivery & Leaflet Map)

### A. Database Schema
*   **Bảng 10: `Shippers`**
    ```sql
    CREATE TABLE Shippers (
        ShipperID INT IDENTITY(1,1) PRIMARY KEY,
        ShipperName NVARCHAR(100) NOT NULL,
        Phone VARCHAR(15) NOT NULL,
        VehicleNumber VARCHAR(20) NULL,
        IsAvailable BIT DEFAULT 1
    );
    ```
*   **Bảng 11: `DeliveryTrips`**
    ```sql
    CREATE TABLE DeliveryTrips (
        TripID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        ShipperID INT NOT NULL,
        StartTime DATETIME DEFAULT GETDATE(),
        EndTime DATETIME NULL,
        Status NVARCHAR(50) DEFAULT N'Đang chuẩn bị',
        CONSTRAINT FK_DeliveryTrips_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
        CONSTRAINT FK_DeliveryTrips_Shippers FOREIGN KEY (ShipperID) REFERENCES Shippers(ShipperID)
    );
    ```

---

## 7. PHÂN HỆ 7: TRỢ LÝ AI CHATBOT (AI Chatbot & Recommendations)

### A. Database Schema
*   **Bảng 12: `ChatbotLogs`**
    ```sql
    CREATE TABLE ChatbotLogs (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NULL,
        SessionID VARCHAR(100) NOT NULL,
        ConversationData NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ChatbotLogs_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
    );
    ```

---

## 8. PHÂN HỆ 8: ĐÁNH GIÁ & YÊU THÍCH (Reviews & Favorites)

### A. Database Schema
*   **Bảng 13: `Favorites`**
    ```sql
    CREATE TABLE Favorites (
        FavoriteID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ProductID INT NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Favorites_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Favorites_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
        CONSTRAINT UQ_User_Product_Fav UNIQUE (UserID, ProductID)
    );
    ```
*   **Bảng 14: `Reviews`**
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

## 9. PHÂN HỆ 9: THÔNG BÁO & CHAT REALTIME (Socket.io Gateway)

### A. Database Schema
*   **Bảng 15: `Notifications`**
    ```sql
    CREATE TABLE Notifications (
        NotificationID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        IsRead BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
    );
    ```
*   **Bảng 16: `ChatMessages`**
    ```sql
    CREATE TABLE ChatMessages (
        MessageID INT IDENTITY(1,1) PRIMARY KEY,
        SenderID INT NOT NULL,
        ReceiverID INT NOT NULL,
        MessageText NVARCHAR(MAX) NOT NULL,
        SentAt DATETIME DEFAULT GETDATE(),
        IsRead BIT DEFAULT 0,
        CONSTRAINT FK_ChatMessages_Sender FOREIGN KEY (SenderID) REFERENCES Users(UserID),
        CONSTRAINT FK_ChatMessages_Receiver FOREIGN KEY (ReceiverID) REFERENCES Users(UserID)
    );
    ```

---

## 10. PHÂN HỆ 10: THEO DÕI HÀNH VI & GỢI Ý NÂNG CAO (User Action Logging)

### A. Database Schema
*   **Bảng 17: `UserActionLogs`**
    ```sql
    CREATE TABLE UserActionLogs (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ActionType NVARCHAR(50) NOT NULL,
        ProductID INT NULL,
        SearchQuery NVARCHAR(255) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_UserActionLogs_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_UserActionLogs_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
    );
    ```

---

## 11. PHÂN HỆ 11: MARKETING, TĂNG TRƯỞNG & TƯƠNG TÁC
Frontend ReactJS đảm nhiệm logic Social Proof, FOMO Popup, Cross-sell và Zalo Widget.

---

## 12. PHÂN HỆ 12: QUẢN LÝ CHI NHÁNH ĐỘNG (Dynamic Branch Management)

### A. Database Schema
*   **Bảng 18: `Branches`**
    ```sql
    CREATE TABLE Branches (
        BranchID INT IDENTITY(1,1) PRIMARY KEY,
        BranchName NVARCHAR(150) NOT NULL UNIQUE,
        Latitude DECIMAL(9,6) NOT NULL,
        Longitude DECIMAL(9,6) NOT NULL,
        Address NVARCHAR(255) NULL,
        CoverageRadius INT DEFAULT 5,
        Description NVARCHAR(255) NULL,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    ```

---

## 13. PHÂN HỆ 13: QUẢN TRỊ TRUNG TÂM (Admin Dashboard)
Tích hợp Recharts vẽ biểu đồ từ cơ sở dữ liệu (tối ưu qua các Views như v_SanPhamBanChay), xuất dữ liệu Excel (.csv) và cung cấp tài liệu API tự động qua Swagger UI.
