-- =========================================================================
-- HỆ THỐNG ĐẶT VÀ GIAO ĐỒ ĂN TRỰC TUYẾN FIVEFOOD
-- FILE SQL SCHEMA KHỞI TẠO CƠ SỞ DỮ LIỆU HOÀN CHỈNH CHO SQL SERVER 2022
-- =========================================================================

-- Khởi tạo Database mới (Bỏ comment nếu muốn tạo mới hoàn toàn)
USE master;
GO
DROP DATABASE IF EXISTS DOAN_H;
GO
CREATE DATABASE DOAN_H;
GO
USE DOAN_H;
GO
-- ==========================================
-- 1. XÓA BẢNG VÀ LOGIC CŨ (NẾU CÓ)
-- ==========================================
IF OBJECT_ID('dbo.trg_HoaDon_UpdateStatus', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_HoaDon_UpdateStatus;
IF OBJECT_ID('dbo.trg_ChiTietHoaDon_Insert', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_ChiTietHoaDon_Insert;
IF OBJECT_ID('dbo.sp_TaoHoaDon', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_TaoHoaDon;
IF OBJECT_ID('dbo.v_RecommendedProducts', 'V') IS NOT NULL DROP VIEW dbo.v_RecommendedProducts;
IF OBJECT_ID('dbo.v_SanPhamBanChay', 'V') IS NOT NULL DROP VIEW dbo.v_SanPhamBanChay;

-- Tắt System Versioning trước khi xóa bảng Products
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Products' AND temporal_type = 2)
BEGIN
    ALTER TABLE Products SET (SYSTEM_VERSIONING = OFF);
    DROP TABLE Products;
    DROP TABLE ProductsHistory;
END;

IF OBJECT_ID('dbo.ChatbotLogs', 'U') IS NOT NULL DROP TABLE dbo.ChatbotLogs;
IF OBJECT_ID('dbo.ChatMessages', 'U') IS NOT NULL DROP TABLE dbo.ChatMessages;
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID('dbo.Reviews', 'U') IS NOT NULL DROP TABLE dbo.Reviews;
IF OBJECT_ID('dbo.Favorites', 'U') IS NOT NULL DROP TABLE dbo.Favorites;
IF OBJECT_ID('dbo.DeliveryTrips', 'U') IS NOT NULL DROP TABLE dbo.DeliveryTrips;
IF OBJECT_ID('dbo.Shippers', 'U') IS NOT NULL DROP TABLE dbo.Shippers;
IF OBJECT_ID('dbo.Transactions', 'U') IS NOT NULL DROP TABLE dbo.Transactions;
IF OBJECT_ID('dbo.OrderDetails', 'U') IS NOT NULL DROP TABLE dbo.OrderDetails;
IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID('dbo.Promotions', 'U') IS NOT NULL DROP TABLE dbo.Promotions;
IF OBJECT_ID('dbo.CartItems', 'U') IS NOT NULL DROP TABLE dbo.CartItems;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;

-- ==========================================
-- 2. KHỞI TẠO BẢNG DỮ LIỆU
-- ==========================================

-- Bảng Roles (Vai trò người dùng)
CREATE TABLE Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);

-- Bảng Users (Tài khoản người dùng)
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

-- Bảng Categories (Danh mục sản phẩm)
CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL
);

-- Bảng Products (System-Versioned Temporal Table - SQL Server 2022)
-- Tự động hóa việc ghi lại lịch sử giá và tồn kho
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

-- Bảng CartItems (Giỏ hàng của người dùng trên hệ thống)
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

-- Bảng Promotions (Voucher khuyến mãi)
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

-- Bảng Orders (Đơn đặt hàng)
CREATE TABLE Orders (
    OrderID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    OrderDate DATETIME DEFAULT GETDATE(),
    TotalAmount DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) DEFAULT 0,
    FinalAmount DECIMAL(18,2) NOT NULL,
    PromotionID INT NULL,
    Status NVARCHAR(50) DEFAULT N'Chờ xác nhận', -- Chờ xác nhận, Đang giao, Hoàn thành, Đã hủy
    ShippingAddress NVARCHAR(255) NOT NULL,
    Latitude DECIMAL(9,6) NULL, -- Phục vụ định vị bản đồ số Leaflet
    Longitude DECIMAL(9,6) NULL,
    PaymentMethod NVARCHAR(50) NOT NULL, -- COD, VNPAY, MOMO
    PaymentStatus NVARCHAR(50) DEFAULT N'Chưa thanh toán', -- Chưa thanh toán, Đã thanh toán, Thất bại
    CONSTRAINT FK_Orders_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Orders_Promotions FOREIGN KEY (PromotionID) REFERENCES Promotions(PromotionID)
);

-- Bảng OrderDetails (Chi tiết đơn đặt hàng)
CREATE TABLE OrderDetails (
    OrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT NOT NULL,
    ProductID INT NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_OrderDetails_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    CONSTRAINT FK_OrderDetails_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);

-- Bảng Transactions (Giao dịch cổng thanh toán online)
CREATE TABLE Transactions (
    TransactionID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT NOT NULL,
    PaymentGateway NVARCHAR(50) NOT NULL, -- VNPAY, MOMO
    TransactionNo VARCHAR(100) NOT NULL UNIQUE,
    Amount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(50) NOT NULL, -- Thanh cong, That bai
    ResponseCode VARCHAR(10) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Transactions_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);

-- Bảng Shippers (Thông tin nhân viên giao hàng)
CREATE TABLE Shippers (
    ShipperID INT IDENTITY(1,1) PRIMARY KEY,
    ShipperName NVARCHAR(100) NOT NULL,
    Phone VARCHAR(15) NOT NULL,
    VehicleNumber VARCHAR(20) NULL,
    IsAvailable BIT DEFAULT 1
);

-- Bảng DeliveryTrips (Hành trình chuyến giao hàng)
CREATE TABLE DeliveryTrips (
    TripID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT NOT NULL,
    ShipperID INT NOT NULL,
    StartTime DATETIME DEFAULT GETDATE(),
    EndTime DATETIME NULL,
    Status NVARCHAR(50) DEFAULT N'Đang chuẩn bị', -- Đang chuẩn bị, Đang giao, Hoàn thành
    CONSTRAINT FK_DeliveryTrips_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    CONSTRAINT FK_DeliveryTrips_Shippers FOREIGN KEY (ShipperID) REFERENCES Shippers(ShipperID)
);

-- Bảng Favorites (Món ăn yêu thích của Khách hàng)
CREATE TABLE Favorites (
    FavoriteID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ProductID INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Favorites_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Favorites_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
    CONSTRAINT UQ_User_Product_Fav UNIQUE (UserID, ProductID)
);

-- Bảng Reviews (Đánh giá món ăn sau khi nhận đơn thành công)
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

-- Bảng Notifications (Thông báo thời gian thực)
CREATE TABLE Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Bảng ChatMessages (Tin nhắn hỗ trợ kỹ thuật khách hàng - admin)
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

-- Bảng ChatbotLogs (Lưu trữ lịch sử chat tư vấn AI hỗ trợ phân tích)
CREATE TABLE ChatbotLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL,
    SessionID VARCHAR(100) NOT NULL,
    ConversationData NVARCHAR(MAX) NOT NULL, -- Dữ liệu định dạng JSON cuộc hội thoại
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_ChatbotLogs_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

GO

-- ==========================================
-- 3. KHỞI TẠO TRIGGERS (TỰ ĐỘNG HÓA KHO HÀNG)
-- ==========================================

-- Trigger trừ kho ngay sau khi chèn sản phẩm vào hóa đơn chi tiết
CREATE TRIGGER trg_ChiTietHoaDon_Insert
ON OrderDetails
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p
    SET p.Inventory = p.Inventory - i.Quantity
    FROM Products p
    INNER JOIN inserted i ON p.ProductID = i.ProductID;
END;
GO

-- Trigger tự động hoàn trả kho và voucher nếu đơn hàng chuyển trạng thái 'Đã hủy'
CREATE TRIGGER trg_HoaDon_UpdateStatus
ON Orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Kiểm tra nếu trạng thái chuyển sang 'Đã hủy' và trước đó chưa phải 'Đã hủy'
    IF EXISTS (
        SELECT 1 
        FROM inserted i
        INNER JOIN deleted d ON i.OrderID = d.OrderID
        WHERE i.Status = N'Đã hủy' AND d.Status <> N'Đã hủy'
    )
    BEGIN
        -- 1. Hoàn trả tồn kho cho tất cả sản phẩm thuộc đơn hàng
        UPDATE p
        SET p.Inventory = p.Inventory + od.Quantity
        FROM Products p
        INNER JOIN OrderDetails od ON p.ProductID = od.ProductID
        INNER JOIN inserted i ON od.OrderID = i.OrderID
        INNER JOIN deleted d ON i.OrderID = d.OrderID
        WHERE i.Status = N'Đã hủy' AND d.Status <> N'Đã hủy';
        
        -- 2. Cộng lại 1 lượt sử dụng của voucher được áp dụng
        UPDATE pr
        SET pr.UsedCount = CASE WHEN pr.UsedCount > 0 THEN pr.UsedCount - 1 ELSE 0 END
        FROM Promotions pr
        INNER JOIN inserted i ON pr.PromotionID = i.PromotionID
        INNER JOIN deleted d ON d.OrderID = i.OrderID
        WHERE i.Status = N'Đã hủy' AND d.Status <> N'Đã hủy' AND i.PromotionID IS NOT NULL;
    END
END;
GO

-- ==========================================
-- 4. KHỞI TẠO STORED PROCEDURE (SP ĐẶT HÀNG)
-- ==========================================

-- Stored Procedure tạo hóa đơn được bọc trong TRANSACTION an toàn (ACID)
CREATE PROCEDURE sp_TaoHoaDon
    @UserID INT,
    @ShippingAddress NVARCHAR(255),
    @Latitude DECIMAL(9,6),
    @Longitude DECIMAL(9,6),
    @PaymentMethod NVARCHAR(50),
    @PromoCode VARCHAR(50) = NULL,
    @NewOrderID INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- 1. Kiểm tra tài khoản người dùng hoạt động
        IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID AND IsLocked = 0)
        BEGIN
            THROW 50001, N'Người dùng không tồn tại hoặc tài khoản đã bị khóa.', 1;
        END;
        
        -- 2. Kiểm tra giỏ hàng của người dùng trên hệ thống
        IF NOT EXISTS (SELECT 1 FROM CartItems WHERE UserID = @UserID)
        BEGIN
            THROW 50002, N'Giỏ hàng trống. Không thể thực hiện đặt hàng.', 1;
        END;
        
        -- 3. Tính tổng giá trị đơn hàng trước giảm giá
        DECLARE @TotalAmount DECIMAL(18,2);
        SELECT @TotalAmount = SUM(p.Price * c.Quantity)
        FROM CartItems c
        INNER JOIN Products p ON c.ProductID = p.ProductID
        WHERE c.UserID = @UserID;
        
        -- 4. Xử lý Voucher khuyến mãi (nếu có áp dụng)
        DECLARE @PromotionID INT = NULL;
        DECLARE @DiscountPercentage INT = 0;
        DECLARE @MaxDiscountAmount DECIMAL(18,2) = 0;
        DECLARE @MinOrderValue DECIMAL(18,2) = 0;
        DECLARE @DiscountAmount DECIMAL(18,2) = 0;
        
        IF @PromoCode IS NOT NULL AND @PromoCode <> ''
        BEGIN
            SELECT 
                @PromotionID = PromotionID,
                @DiscountPercentage = DiscountPercentage,
                @MaxDiscountAmount = MaxDiscountAmount,
                @MinOrderValue = MinOrderValue
            FROM Promotions
            WHERE PromoCode = @PromoCode 
              AND StartDate <= GETDATE() 
              AND EndDate >= GETDATE()
              AND UsedCount < UsageLimit;
              
            IF @PromotionID IS NULL
            BEGIN
                THROW 50003, N'Mã khuyến mãi không hợp lệ, đã hết hạn hoặc hết lượt dùng.', 1;
            END;
            
            IF @TotalAmount < @MinOrderValue
            BEGIN
                DECLARE @ErrMsg NVARCHAR(255) = N'Đơn hàng không đạt giá trị tối thiểu ' + CAST(@MinOrderValue AS NVARCHAR(50)) + N' để áp dụng mã giảm giá này.';
                THROW 50004, @ErrMsg, 1;
            END;
            
            -- Tính số tiền giảm giá
            SET @DiscountAmount = (@TotalAmount * @DiscountPercentage) / 100.0;
            IF @DiscountAmount > @MaxDiscountAmount
            BEGIN
                SET @DiscountAmount = @MaxDiscountAmount;
            END;
        END;
        
        DECLARE @FinalAmount DECIMAL(18,2) = @TotalAmount - @DiscountAmount;
        
        -- 5. Kiểm tra tồn kho của tất cả mặt hàng trong giỏ hàng
        IF EXISTS (
            SELECT 1
            FROM CartItems c
            INNER JOIN Products p ON c.ProductID = p.ProductID
            WHERE c.UserID = @UserID AND p.Inventory < c.Quantity
        )
        BEGIN
            THROW 50005, N'Một số món ăn trong giỏ hàng của bạn đã hết hoặc không còn đủ số lượng bán.', 1;
        END;
        
        -- 6. Tạo hóa đơn mới
        INSERT INTO Orders (UserID, TotalAmount, DiscountAmount, FinalAmount, PromotionID, Status, ShippingAddress, Latitude, Longitude, PaymentMethod, PaymentStatus)
        VALUES (@UserID, @TotalAmount, @DiscountAmount, @FinalAmount, @PromotionID, N'Chờ xác nhận', @ShippingAddress, @Latitude, @Longitude, @PaymentMethod, N'Chưa thanh toán');
        
        SET @NewOrderID = SCOPE_IDENTITY();
        
        -- 7. Chuyển giỏ hàng sang chi tiết đơn hàng (Trigger trg_ChiTietHoaDon_Insert sẽ tự chạy để giảm tồn kho)
        INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice)
        SELECT @NewOrderID, c.ProductID, c.Quantity, p.Price
        FROM CartItems c
        INNER JOIN Products p ON c.ProductID = p.ProductID
        WHERE c.UserID = @UserID;
        
        -- 8. Cập nhật số lần sử dụng của Voucher
        IF @PromotionID IS NOT NULL
        BEGIN
            UPDATE Promotions
            SET UsedCount = UsedCount + 1
            WHERE PromotionID = @PromotionID;
        END;
        
        -- 9. Dọn sạch giỏ hàng của người dùng sau khi đặt thành công
        DELETE FROM CartItems WHERE UserID = @UserID;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
        END;
        THROW;
    END CATCH;
END;
GO

-- ==========================================
-- 5. KHỞI TẠO VIEWS PHỤC VỤ HỆ GỢI Ý & THỐNG KÊ
-- ==========================================

-- View hỗ trợ Recommender System: Thống kê số lượng từng món ăn khách đã đặt mua
CREATE VIEW v_RecommendedProducts AS
SELECT UserID, ProductID, SUM(Quantity) AS TotalQuantityOrdered
FROM Orders o
INNER JOIN OrderDetails od ON o.OrderID = od.OrderID
WHERE o.Status = N'Hoàn thành'
GROUP BY UserID, ProductID;
GO

-- View thống kê các món ăn bán chạy nhất toàn hệ thống
CREATE VIEW v_SanPhamBanChay AS
SELECT TOP 10 od.ProductID, p.ProductName, SUM(od.Quantity) AS TotalSold
FROM OrderDetails od
INNER JOIN Products p ON od.ProductID = p.ProductID
INNER JOIN Orders o ON od.OrderID = o.OrderID
WHERE o.Status = N'Hoàn thành'
GROUP BY od.ProductID, p.ProductName
ORDER BY TotalSold DESC;
GO
