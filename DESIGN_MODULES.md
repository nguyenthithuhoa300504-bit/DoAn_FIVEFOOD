# TÀI LIỆU THIẾT KẾ CÁC PHÂN HỆ HỆ THỐNG (DESIGN_MODULES)
## DỰ ÁN: PHÁT TRIỂN ỨNG DỤNG WEB ĐẶT VÀ GIAO ĐỒ ĂN TRỰC TUYẾN FIVEFOOD

Tài liệu này tổng hợp toàn bộ thông tin thiết kế kỹ thuật của **9 phân hệ (modules)** cấu thành nên hệ thống FIVEFOOD, đóng vai trò làm tài liệu tham chiếu (documentation) trong quá trình phát triển mã nguồn (Backend NestJS, Database SQL Server 2022, Frontend ReactJS).

---

## CÔNG NGHỆ SỬ DỤNG (TECH STACK)

### 1. Giao diện (Frontend)
*   **Core Framework**: ReactJS (phiên bản 18 trở lên) khởi tạo dự án cực nhanh bằng **Vite**.
*   **Thiết kế & Giao diện**: TailwindCSS, sử dụng font chữ hiện đại (Google Fonts như Roboto), hiệu ứng Glassmorphism và chuyển động mượt mà (micro-animations).
*   **Bản đồ số**: **Leaflet** & **React-Leaflet** tích hợp bản đồ mã nguồn mở **OpenStreetMap** để chọn địa chỉ nhận hàng và hiển thị shipper giao đơn.
*   **Vẽ Đồ thị & Thống kê**: **Recharts** (hoặc Chart.js) phục vụ trực quan hóa dữ liệu trên Admin Dashboard.
*   **Kết nối Realtime**: **Sử dụng webSocket (Socket.io)** để nhận thông báo và tọa độ shipper thời gian thực.
*   **Truy xuất API**: Hàm helper `apiFetch` (dựa trên Fetch API hoặc Axios) có cơ chế tự động gửi kèm JWT Token và tự xử lý hướng đăng nhập lại khi token hết hạn.

### 2. Dịch vụ API (Backend)
*   **Core Framework**: **NestJS** (Node.js framework) cấu trúc phân tầng, quản lý module độc lập, hiệu năng cao và dễ mở rộng.
*   **Xác thực & Bảo mật**: **Passport.js** tích hợp **JWT (JSON Web Token)** để cấp quyền truy cập APIs, băm mã hóa mật khẩu bằng thư viện **bcrypt**.
*   **Giao tiếp Realtime**: **WebSockets** thông qua gói thư viện `@nestjs/websockets` và `@nestjs/platform-socket.io`.
*   **Tích hợp AI**: Gọi trực tiếp API (Fetch API) chuẩn OpenAI-compatible để tương tác với mô hình **LLaMA-3.1-8B** siêu tốc trên nền tảng **Groq**.
*   **Kết nối Database**: Sử dụng thư viện mssql để kết nối và thao tác dữ liệu (Gọi trực tiếp Stored Procedures/Triggers của SQL Server).

### 3. Hệ quản trị Cơ sở dữ liệu (Database)
*   **Hệ quản trị**: **Microsoft SQL Server 2022**.
*   **Tính năng đặc thù được áp dụng**:
    *   **Temporal Tables (System-Versioned)**: Tự động hóa việc theo dõi, truy vết toàn bộ lịch sử biến động giá cả và tồn kho của món ăn trên bảng `Products`.
    *   **Xử lý JSON nguyên bản (JSON Native Support)**: Sử dụng cột `NVARCHAR(MAX)` kết hợp các hàm `JSON_VALUE`, `JSON_QUERY` để lưu và phân tích sâu các hội thoại tư vấn món ăn của Chatbot.
    *   **Stored Procedures & Transactions**: Thực thi nghiệp vụ đặt hàng thông qua thủ tục `sp_TaoHoaDon` được bảo vệ bằng cấu trúc `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` để tránh lỗi bất đồng bộ.
    *   **Triggers**: Trigger trừ kho khi đặt hàng và Trigger khôi phục kho/voucher khi hủy đơn hàng.

---

## MỤC LỤC
0. [Công nghệ Sử dụng (Tech Stack)](#cong-nghe-su-dung-tech-stack)
1. [Phân hệ 1: Xác thực & Phân quyền (Auth & Users)](#1-phan-he-1-xac-thuc--phan-quyen-auth--users)
2. [Phân hệ 2: Quản lý Thực đơn & Kho hàng (Products & Categories)](#2-phan-he-2-quan-ly-thuc-don--kho-hang-products--categories)
3. [Phân hệ 3: Giỏ hàng Hỗn hợp (Hybrid Cart)](#3-phan-he-3-gio-hang-hon-hop-hybrid-cart)
4. [Phân hệ 4: Đặt hàng & Khuyến mãi (Orders & Promotions)](#4-phan-he-4-dat-hang--khuyen-mai-orders--promotions)
5. [Phân hệ 5: Tích hợp Cổng thanh toán (VNPay / MoMo)](#5-phan-he-5-tich-hop-cong-thanh-toan-vnpay--momo)
6. [Phân hệ 6: Vận chuyển & Bản đồ số (Delivery & Leaflet Map)](#6-phan-he-6-van-chuyen--ban-do-so-delivery--leaflet-map)
7. [Phân hệ 7: Trợ lý AI Chatbot & Gợi ý (AI Chatbot & Recommendations)](#7-phan-he-7-tro-ly-ai-chatbot--goi-y-ai-chatbot--recommendations)
8. [Phân hệ 8: Đánh giá & Yêu thích (Reviews & Favorites)](#8-phan-he-8-danh-gia--yeu-thich-reviews--favorites)
9. [Phân hệ 9: Thông báo & Chat Realtime (Socket.io Gateway)](#9-phan-he-9-thong-bao--chat-realtime-socketio-gateway)


---

## 1. PHÂN HỆ 1: XÁC THỰC & PHÂN QUYỀN (Auth & Users)

### Tổng quan (Overview)
Phân hệ này chịu trách nhiệm quản lý định danh người dùng (Khách hàng, Admin, Shipper). Nó cung cấp các tính năng cốt lõi như Đăng ký, Đăng nhập (sử dụng JSON Web Token - JWT để bảo mật phiên làm việc), Đổi mật khẩu, và Phân quyền (Authorization). Việc phân quyền đảm bảo rằng chỉ có Admin mới có quyền quản lý hệ thống, trong khi Khách hàng chỉ có quyền xem và đặt món.

### A. Database Schema
*   **Bảng `Roles`**: Lưu định nghĩa vai trò người dùng.
    ```sql
    CREATE TABLE Roles (
        RoleID INT IDENTITY(1,1) PRIMARY KEY,
        RoleName NVARCHAR(50) NOT NULL UNIQUE
    );
    ```
*   **Bảng `Users`**: Lưu trữ thông tin tài khoản người dùng và liên kết vai trò.
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

### B. RESTful API Endpoints
| Method | Endpoint | Quyền truy cập | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản Khách hàng mới (mã hóa mật khẩu bằng bcrypt) |
| `POST` | `/api/auth/login` | Public | Đăng nhập tài khoản, trả về JWT Token và thông tin cơ bản |
| `GET` | `/api/auth/profile` | Đăng nhập | Lấy thông tin cá nhân của tài khoản hiện tại |
| `PUT` | `/api/auth/profile` | Đăng nhập | Cập nhật thông tin cá nhân (Họ tên, SĐT) |
| `PUT` | `/api/auth/change-password` | Đăng nhập | Đổi mật khẩu |
| `GET` | `/api/admin/users` | Admin | Lấy danh sách toàn bộ người dùng kèm phân trang |
| `PUT` | `/api/admin/users/:id/lock` | Admin | Khóa hoặc mở khóa tài khoản người dùng |

---

## 2. PHÂN HỆ 2: QUẢN LÝ THỰC ĐƠN & KHO HÀNG (Products & Categories)

### Tổng quan (Overview)
Phân hệ này cho phép lưu trữ và hiển thị danh mục các món ăn. Đối với Admin, phân hệ cung cấp tính năng CRUD (Thêm, Đọc, Sửa, Xóa) sản phẩm. Điểm đặc biệt là sử dụng tính năng Temporal Tables của SQL Server để tự động lưu lại lịch sử biến động giá bán và tồn kho theo thời gian, giúp đối soát dữ liệu minh bạch và an toàn.

### A. Database Schema (Tận dụng SQL Server 2022 System-Versioned Temporal Tables)
*   **Bảng `Categories`**: Danh mục món ăn.
    ```sql
    CREATE TABLE Categories (
        CategoryID INT IDENTITY(1,1) PRIMARY KEY,
        CategoryName NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255) NULL
    );
    ```
*   **Bảng `Products` (System-Versioned Temporal Table)**: Tự động ghi lại lịch sử giá và số lượng kho mỗi khi có hành động `UPDATE` hoặc `DELETE`.
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

### B. RESTful API Endpoints
| Method | Endpoint | Quyền truy cập | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | Lấy thực đơn (hỗ trợ phân trang, lọc theo Category, tìm kiếm theo tên) |
| `GET` | `/api/products/:id` | Public | Xem thông tin chi tiết món ăn |
| `POST` | `/api/admin/products` | Admin | Thêm mới món ăn |
| `PUT` | `/api/admin/products/:id` | Admin | Sửa thông tin món ăn (tự động cập nhật lịch sử tại `ProductsHistory`) |
| `DELETE` | `/api/admin/products/:id` | Admin | Xóa mềm/Khóa món ăn |
| `GET` | `/api/admin/products/:id/history` | Admin | Truy vấn lịch sử thay đổi giá/kho của sản phẩm bằng lệnh `FOR SYSTEM_TIME ALL` |

---

## 3. PHÂN HỆ 3: GIỎ HÀNG HỖN HỢP (Hybrid Cart)

### Tổng quan (Overview)
Cơ chế "Hỗn hợp" (Hybrid) giúp tối ưu trải nghiệm mua sắm: khi khách chưa đăng nhập, giỏ hàng được lưu tạm trên trình duyệt (LocalStorage). Ngay khi đăng nhập thành công, dữ liệu này lập tức được đồng bộ lên CSDL (Database) để khách hàng có thể tiếp tục thanh toán trên điện thoại hoặc thiết bị khác mà không bị mất các món đã chọn.

### A. Database Schema
*   **Bảng `CartItems`**: Lưu trữ giỏ hàng của người dùng đã đăng nhập.
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

### B. Luồng Nghiệp vụ & API Endpoints
1.  **Chưa đăng nhập**: Giỏ hàng lưu trữ hoàn toàn tại `localStorage` dưới dạng chuỗi JSON của mảng đối tượng: `[{ productId: 1, quantity: 2 }]`.
2.  **Đăng nhập thành công**: Frontend lấy mảng này gửi lên API `/api/cart/sync` để đồng bộ.
3.  **Backend xử lý**: Duyệt qua danh sách, thực hiện gộp số lượng (`MERGE` hoặc cập nhật cộng dồn số lượng) nếu món ăn đã có trong DB của user, hoặc tạo mới bản ghi nếu chưa có.

| Method | Endpoint | Quyền truy cập | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Đăng nhập | Lấy giỏ hàng hiện tại của khách hàng từ DB |
| `POST` | `/api/cart/add` | Đăng nhập | Thêm món ăn vào giỏ hàng |
| `PUT` | `/api/cart/update` | Đăng nhập | Cập nhật số lượng món ăn trong giỏ hàng |
| `DELETE` | `/api/cart/remove/:productId` | Đăng nhập | Xóa món ăn khỏi giỏ hàng |
| `POST` | `/api/cart/sync` | Đăng nhập | Đồng bộ giỏ hàng từ LocalStorage lên DB khi đăng nhập thành công |

---

## 4. PHÂN HỆ 4: ĐẶT HÀNG & KHUYẾN MÃI (Orders & Promotions)

### Tổng quan (Overview)
Đây là phân hệ trung tâm xử lý luồng đặt món, từ việc áp dụng mã giảm giá (Vouchers), tính toán tổng tiền, cho đến khởi tạo hóa đơn. Dưới Database, nghiệp vụ đặt hàng được bao bọc trong một Giao dịch (Transaction) nhằm đảm bảo tính toàn vẹn dữ liệu: kho chỉ bị trừ khi đơn hàng tạo thành công, và nếu đơn bị hủy, hệ thống tự động hoàn lại kho và lượt dùng mã giảm giá thông qua các Triggers.

### A. Database Schema
*   **Bảng `Promotions`**: Khuyến mãi / Mã giảm giá.
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
*   **Bảng `Orders`**: Hóa đơn / Đơn đặt hàng.
    ```sql
    CREATE TABLE Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        OrderDate DATETIME DEFAULT GETDATE(),
        TotalAmount DECIMAL(18,2) NOT NULL, -- Giá trị đơn hàng trước giảm giá
        DiscountAmount DECIMAL(18,2) DEFAULT 0, -- Số tiền giảm giá
        FinalAmount DECIMAL(18,2) NOT NULL, -- Tiền khách thực thanh toán
        PromotionID INT NULL,
        Status NVARCHAR(50) DEFAULT N'Chờ xác nhận', -- Chờ xác nhận, Đang giao, Hoàn thành, Đã hủy
        ShippingAddress NVARCHAR(255) NOT NULL,
        Latitude DECIMAL(9,6) NULL, -- Tọa độ khách hàng
        Longitude DECIMAL(9,6) NULL,
        PaymentMethod NVARCHAR(50) NOT NULL, -- COD, VNPAY, MOMO
        PaymentStatus NVARCHAR(50) DEFAULT N'Chưa thanh toán', -- Chưa thanh toán, Đã thanh toán, Thất bại
        CONSTRAINT FK_Orders_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Orders_Promotions FOREIGN KEY (PromotionID) REFERENCES Promotions(PromotionID)
    );
    ```
*   **Bảng `OrderDetails`**: Chi tiết hóa đơn.
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

### B. Logic Database (Stored Procedure & Triggers)
1.  **Stored Procedure `sp_TaoHoaDon`**:
    Tạo hóa đơn, chèn dữ liệu chi tiết hóa đơn từ danh sách giỏ hàng. Đóng gói trong TRANSACTION.
    ```sql
    CREATE PROCEDURE sp_TaoHoaDon
        @UserID INT,
        @ShippingAddress NVARCHAR(255),
        @Latitude DECIMAL(9,6),
        @Longitude DECIMAL(9,6),
        @PaymentMethod NVARCHAR(50),
        @PromoCode VARCHAR(50) = NULL
    AS
    BEGIN
        SET NOCOUNT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
            
            -- Logic kiểm tra tồn kho, kiểm tra voucher còn hạn hay không.
            -- Tính toán giảm giá, thêm mới vào bảng Orders.
            -- Lấy dữ liệu từ CartItems để insert vào OrderDetails.
            -- Xóa dữ liệu trong CartItems của người dùng.
            -- Tăng UsedCount của Promotion (nếu có).
            
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END;
    ```
2.  **Trigger `trg_ChiTietHoaDon_Insert`**: Tự động trừ kho của `Products` khi thêm chi tiết hóa đơn.
3.  **Trigger `trg_HoaDon_UpdateStatus`**: Khi đơn hàng bị hủy (`Status` = `Đã hủy`), tự động khôi phục số lượng tồn kho của sản phẩm và hoàn trả 1 lượt sử dụng cho mã khuyến mãi.

### C. RESTful API Endpoints
| Method | Endpoint | Quyền truy cập | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Đăng nhập | Tạo đơn hàng mới (gọi `sp_TaoHoaDon` thông qua Db transaction) |
| `GET` | `/api/orders` | Đăng nhập | Xem danh sách đơn hàng đã mua của khách hàng |
| `GET` | `/api/orders/:id` | Đăng nhập | Xem chi tiết trạng thái đơn hàng |
| `PUT` | `/api/admin/orders/:id/status` | Admin | Cập nhật trạng thái đơn hàng (kích hoạt trigger hoàn kho nếu status = Đã hủy) |

---

## 5. PHÂN HỆ 5: TÍCH HỢP CỔNG THANH TOÁN (VNPay / MoMo)

### Tổng quan (Overview)
Phân hệ này số hóa trải nghiệm thanh toán bằng cách tích hợp cổng thanh toán trực tuyến (VNPay Sandbox). Hệ thống mã hóa thông tin đơn hàng, điều hướng khách tới cổng VNPay. Sau khi khách thanh toán thành công, VNPay sẽ gửi tín hiệu ngầm (IPN - Instant Payment Notification) về server Backend để hệ thống tự động cập nhật trạng thái đơn hàng một cách bảo mật tuyệt đối, chống gian lận.

### A. Database Schema
*   **Bảng `Transactions`**: Lưu lịch sử giao dịch thanh toán trực tuyến.
    ```sql
    CREATE TABLE Transactions (
        TransactionID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        PaymentGateway NVARCHAR(50) NOT NULL, -- VNPAY hoặc MOMO
        TransactionNo VARCHAR(100) NOT NULL UNIQUE, -- Mã giao dịch bên cổng thanh toán
        Amount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(50) NOT NULL, -- Thanh cong, That bai
        ResponseCode VARCHAR(10) NULL, -- Mã lỗi phản hồi
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Transactions_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    );
    ```

### B. Luồng Nghiệp vụ & API Endpoints
1.  Khách đặt hàng chọn thanh toán qua VNPay/MoMo.
2.  Backend tạo URL thanh toán dẫn sang cổng thanh toán (Sandbox).
3.  Khách hàng thực hiện thanh toán trên trang của VNPay/MoMo.
4.  Cổng thanh toán redirect khách hàng về trang Frontend và đồng thời gọi ngầm API IPN của Backend để đồng bộ trạng thái giao dịch một cách an toàn.

| Method | Endpoint | Quyền truy cập | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payment/create-vnpay-url` | Đăng nhập | Tạo URL thanh toán VNPay Sandbox cho đơn hàng |
| `GET` | `/api/payment/vnpay-return` | Public | Nhận kết quả redirect từ VNPay (Frontend gọi) |
| `GET` | `/api/payment/vnpay-ipn` | Public | VNPay IPN URL để nhận và cập nhật trạng thái hóa đơn tự động |

---

## 6. PHÂN HỆ 6: VẬN CHUYỂN & BẢN ĐỒ SỐ (Delivery & Leaflet Map)

### Tổng quan (Overview)
Bằng việc tích hợp bản đồ mã nguồn mở OpenStreetMap (qua thư viện Leaflet), khách hàng có thể ghim chính xác địa chỉ nhận hàng. Đặc biệt, khi đơn chuyển sang trạng thái "Đang giao", một tiến trình mô phỏng hành trình giao hàng được kích hoạt, cho phép khách hàng theo dõi tọa độ di chuyển của Shipper theo thời gian thực (Realtime) và nhận cảnh báo khi Shipper gọi điện đến giao món.

### A. Database Schema
*   **Bảng `Shippers`**: Thông tin người giao hàng.
    ```sql
    CREATE TABLE Shippers (
        ShipperID INT IDENTITY(1,1) PRIMARY KEY,
        ShipperName NVARCHAR(100) NOT NULL,
        Phone VARCHAR(15) NOT NULL,
        VehicleNumber VARCHAR(20) NULL,
        IsAvailable BIT DEFAULT 1
    );
    ```
*   **Bảng `DeliveryTrips`**: Hành trình vận chuyển đơn hàng.
    ```sql
    CREATE TABLE DeliveryTrips (
        TripID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        ShipperID INT NOT NULL,
        StartTime DATETIME DEFAULT GETDATE(),
        EndTime DATETIME NULL,
        Status NVARCHAR(50) DEFAULT N'Đang chuẩn bị', -- Dang chuan bi, Dang giao, Hoan thanh
        CONSTRAINT FK_DeliveryTrips_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
        CONSTRAINT FK_DeliveryTrips_Shippers FOREIGN KEY (ShipperID) REFERENCES Shippers(ShipperID)
    );
    ```

### B. Mô phỏng Bản đồ số (Frontend + WebSockets)
*   **Frontend (React + Leaflet)**: Bản đồ OpenStreetMap hiển thị biểu tượng Cửa hàng (Tọa độ cố định), Khách hàng (Lấy từ `Orders.Latitude` và `Longitude`), và Shipper.
*   **Mô phỏng Giao hàng**: Cập nhật vị trí điểm giao hàng và theo dõi lộ trình thời gian thực.
*   **Luồng xử lý Gọi điện thoại**: Shipper có thể thực hiện gọi điện cho khách hàng khi đang giao hàng. Nếu shipper gọi quá 3 lần mà khách hàng không bắt máy, hệ thống sẽ tự động cập nhật trạng thái đơn hàng thành "Trả hàng" (trả hàng lại bên shop).

---

## 7. PHÂN HỆ 7: TRỢ LÝ AI CHATBOT & GỢI Ý (AI Chatbot & Recommendations)

### Tổng quan (Overview)
Ứng dụng công nghệ Trí tuệ Nhân tạo hiện đại (LLaMA-3.1-8B) để tạo ra nhân viên tư vấn ảo trực 24/7. Nổi bật nhất là tính năng "Cá nhân hóa trải nghiệm": Khi Khách hàng đăng nhập, Chatbot sẽ lập tức tự động hiển thị danh sách các món ăn gợi ý dựa trên sở thích, các món khách hàng đã mua trước đó hoặc những món đang bán chạy. Khách hàng cũng có thể nhắn tin trực tiếp với Chatbot để nhờ AI tư vấn thêm về thực đơn (vd: món chay, món cay), giúp tăng khả năng chốt đơn và nâng cao sự hài lòng.

### A. Database Schema
*   **Bảng `ChatbotLogs`**: Lưu trữ lịch sử hỏi đáp với AI Chatbot để làm dữ liệu phân tích.
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

### B. Tích hợp AI Chatbot (Groq API - LLaMA 3)
*   Backend gọi API của Groq (Mô hình LLaMA-3.1-8B tốc độ cao).
*   Cung cấp System Prompt chứa danh sách món ăn, giá bán và các chương trình khuyến mãi hiện tại của cửa hàng để AI tư vấn chính xác thực đơn cho khách hàng.
*   Lưu trữ lịch sử hội thoại (ChatbotLogs) và cung cấp giao diện quản trị (Admin Dashboard) cho phép Admin theo dõi, phân tích nhu cầu và hành vi tìm kiếm món ăn của khách hàng.

### C. Thuật toán Đề xuất Món ăn (Recommender System - Rule-based)
*   **Khung nhìn `v_RecommendedProducts`**:
    ```sql
    CREATE VIEW v_RecommendedProducts AS
    SELECT UserID, ProductID, SUM(Quantity) AS TotalQty
    FROM Orders o
    INNER JOIN OrderDetails od ON o.OrderID = od.OrderID
    GROUP BY UserID, ProductID;
    ```
*   **Nguyên tắc gợi ý ở API `/api/recommendations`**:
    1.  Nếu có `UserID`: Gợi ý các sản phẩm thuộc danh mục (Category) mà người dùng mua nhiều nhất (lọc qua View `v_RecommendedProducts`) nhưng chưa mua món này gần đây.
    2.  Gợi ý các món nằm trong danh sách `Favorites` của người dùng.
    3.  Nếu là người dùng mới hoặc chưa có lịch sử: Gợi ý Top 10 sản phẩm bán chạy nhất hệ thống.

---

## 8. PHÂN HỆ 8: ĐÁNH GIÁ & YÊU THÍCH (Reviews & Favorites)

### Tổng quan (Overview)
Sau khi giao dịch hoàn tất, khách hàng có quyền chấm điểm (1-5 sao) và để lại nhận xét, tạo kênh phản hồi chất lượng thực phẩm cho quán. Bên cạnh đó, tính năng "Yêu thích" cho phép người dùng lưu trữ nhanh các món ăn hợp khẩu vị, tạo sự tiện lợi tối đa khi họ quay lại đặt hàng vào lần sau mà không cần tìm kiếm lại.

### A. Database Schema
*   **Bảng `Favorites`**: Danh sách sản phẩm yêu thích.
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
*   **Bảng `Reviews`**: Đánh giá và nhận xét món ăn sau khi nhận hàng.
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

### B. Ràng buộc Nghiệp vụ (SQL Server Constraints)
*   Sử dụng Khóa ngoại kết hợp để đảm bảo khách hàng chỉ đánh giá những món ăn họ đã đặt trong đơn hàng và đơn hàng đó có trạng thái `Hoàn thành`.
*   API `/api/reviews` kiểm tra trước: `SELECT 1 FROM Orders WHERE OrderID = @OrderID AND UserID = @UserID AND Status = N'Hoàn thành'`.

---

## 9. PHÂN HỆ 9: THÔNG BÁO & CHAT REALTIME (Socket.io Gateway)

### Tổng quan (Overview)
Phân hệ thiết lập đường truyền hai chiều liên tục (WebSocket) giữa trình duyệt của khách và Server. Nhờ đó, cửa hàng có thể gửi Thông báo đẩy (Push Notifications) ngay lập tức khi trạng thái đơn hàng thay đổi, đồng thời cung cấp tính năng Live Chat để khách hàng nhắn tin trực tiếp với nhân viên quản trị (Admin) nhằm hỗ trợ giải quyết sự cố đơn hàng ngay tức thì.

### A. Database Schema
*   **Bảng `Notifications`**: Lưu trữ các thông báo hệ thống gửi cho người dùng.
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
*   **Bảng `ChatMessages`**: Lưu tin nhắn giữa Khách hàng và Admin hỗ trợ.
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

### B. Thiết kế WebSocket Gateway (NestJS Gateway)
Sử dụng gói `@nestjs/websockets` để điều phối sự kiện thời gian thực.

#### 1. Sự kiện kết nối (Connection Event)
*   Client gửi kèm JWT token trong phần handshake.
*   Backend xác thực JWT, lấy `UserID` và đưa socket connection của khách hàng vào một Room riêng tên là `room_user_[UserID]`.

#### 2. Chat sự kiện (Chat Events)
*   **Client gửi tin nhắn:** Client gửi sự kiện `sendMessage` kèm payload: `{ receiverId: AdminID, messageText: "Hello" }`.
*   **Backend xử lý:** Lưu vào bảng `ChatMessages` và gửi sự kiện `receiveMessage` tới Room `room_user_[AdminID]`.

#### 3. Cập nhật trạng thái đơn hàng (Order State Events)
*   Khi Admin thay đổi trạng thái đơn hàng trên Dashboard, API backend sẽ phát sự kiện `orderStatusUpdate` đến Room `room_user_[Khách hàng]` tương ứng để Frontend tự cập nhật trạng thái đơn hàng và kích hoạt hiển thị mô phỏng bản đồ shipper.
