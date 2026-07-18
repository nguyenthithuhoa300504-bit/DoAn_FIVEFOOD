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
    ShippingFee DECIMAL(18,2) NOT NULL DEFAULT 0,
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
    IsHidden BIT DEFAULT 0,
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
    @ShippingFee DECIMAL(18,2) = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TotalAmount DECIMAL(18,2) = 0;
    DECLARE @DiscountAmount DECIMAL(18,2) = 0;
    DECLARE @FinalAmount DECIMAL(18,2) = 0;
    DECLARE @PromotionID INT = NULL;
    DECLARE @DiscountPercentage INT = 0;
    DECLARE @MaxDiscountAmount DECIMAL(18,2) = 0;
    DECLARE @MinOrderValue DECIMAL(18,2) = 0;
    DECLARE @UsageLimit INT = 0;
    DECLARE @UsedCount INT = 0;
    DECLARE @StartDate DATETIME;
    DECLARE @EndDate DATETIME;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- 1. Kiểm tra người dùng
        IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID)
        BEGIN
            THROW 50001, N'Người dùng không tồn tại.', 1;
        END;

        -- 2. Kiểm tra giỏ hàng
        IF NOT EXISTS (SELECT 1 FROM CartItems WHERE UserID = @UserID)
        BEGIN
            THROW 50002, N'Giỏ hàng của bạn đang trống.', 1;
        END;

        -- 3. Tính toán tổng tiền hàng
        SELECT @TotalAmount = SUM(c.Quantity * p.Price)
        FROM CartItems c
        INNER JOIN Products p ON c.ProductID = p.ProductID
        WHERE c.UserID = @UserID;

        -- 4. Kiểm tra tồn kho của từng sản phẩm trong giỏ hàng
        IF EXISTS (
            SELECT 1 
            FROM CartItems c 
            INNER JOIN Products p ON c.ProductID = p.ProductID 
            WHERE c.UserID = @UserID AND c.Quantity > p.Inventory
        )
        BEGIN
            DECLARE @ErrProdName NVARCHAR(255);
            SELECT TOP 1 @ErrProdName = p.ProductName
            FROM CartItems c 
            INNER JOIN Products p ON c.ProductID = p.ProductID 
            WHERE c.UserID = @UserID AND c.Quantity > p.Inventory;
            
            DECLARE @ErrMsg NVARCHAR(255) = N'Sản phẩm "' + @ErrProdName + N'" không đủ hàng trong kho.';
            THROW 50003, @ErrMsg, 1;
        END;

        -- 5. Áp dụng mã giảm giá (nếu có)
        IF @PromoCode IS NOT NULL AND LTRIM(RTRIM(@PromoCode)) <> ''
        BEGIN
            SELECT 
                @PromotionID = PromotionID,
                @DiscountPercentage = DiscountPercentage,
                @MaxDiscountAmount = MaxDiscountAmount,
                @MinOrderValue = MinOrderValue,
                @UsageLimit = UsageLimit,
                @UsedCount = ISNULL(UsedCount, 0),
                @StartDate = StartDate,
                @EndDate = EndDate
            FROM Promotions
            WHERE PromoCode = @PromoCode;

            IF @PromotionID IS NULL
            BEGIN
                THROW 50004, N'Mã giảm giá không tồn tại.', 1;
            END;

            -- Kiểm tra ngày
            IF GETDATE() < @StartDate OR GETDATE() > @EndDate
            BEGIN
                THROW 50005, N'Mã giảm giá đã hết hạn hoặc chưa đến ngày áp dụng.', 1;
            END;

            -- Kiểm tra lượt dùng
            IF @UsedCount >= @UsageLimit
            BEGIN
                THROW 50006, N'Mã giảm giá đã hết lượt sử dụng.', 1;
            END;

            -- Kiểm tra giá trị đơn tối thiểu
            IF @TotalAmount < @MinOrderValue
            BEGIN
                DECLARE @MinValStr NVARCHAR(50) = CAST(CAST(@MinOrderValue AS INT) AS VARCHAR(50));
                DECLARE @MinValErrMsg NVARCHAR(255) = N'Đơn hàng chưa đạt giá trị tối thiểu (' + @MinValStr + N' đ) để áp dụng mã.';
                THROW 50007, @MinValErrMsg, 1;
            END;

            -- Tính số tiền giảm
            SET @DiscountAmount = (@TotalAmount * @DiscountPercentage) / 100.0;
            IF @DiscountAmount > @MaxDiscountAmount
            BEGIN
                SET @DiscountAmount = @MaxDiscountAmount;
            END;
        END;

        -- 6. Tính tổng tiền cuối cùng
        SET @FinalAmount = @TotalAmount - @DiscountAmount + @ShippingFee;
        IF @FinalAmount < 0
        BEGIN
            SET @FinalAmount = 0;
        END;

        -- 7. Tạo hóa đơn
        DECLARE @NewOrderID INT;
        INSERT INTO Orders (
            UserID, OrderDate, TotalAmount, DiscountAmount, ShippingFee, FinalAmount, 
            PromotionID, Status, ShippingAddress, Latitude, Longitude, PaymentMethod, PaymentStatus
        )
        VALUES (
            @UserID, GETDATE(), @TotalAmount, @DiscountAmount, @ShippingFee, @FinalAmount,
            @PromotionID, N'Chờ xác nhận', @ShippingAddress, @Latitude, @Longitude, @PaymentMethod, N'Chưa thanh toán'
        );
        
        SET @NewOrderID = SCOPE_IDENTITY();

        -- 8. Thêm chi tiết hóa đơn
        INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice)
        SELECT @NewOrderID, c.ProductID, c.Quantity, p.Price
        FROM CartItems c
        INNER JOIN Products p ON c.ProductID = p.ProductID
        WHERE c.UserID = @UserID;

        -- 9. Xóa giỏ hàng tạm của người dùng
        DELETE FROM CartItems WHERE UserID = @UserID;

        -- 10. Tăng số lượt đã sử dụng của Voucher
        IF @PromotionID IS NOT NULL
        BEGIN
            UPDATE Promotions
            SET UsedCount = ISNULL(UsedCount, 0) + 1
            WHERE PromotionID = @PromotionID;
        END;

        COMMIT TRANSACTION;
        
        -- Trả về dữ liệu để API Node.js đọc
        SELECT 
            @NewOrderID AS OrderID,
            @FinalAmount AS FinalAmount,
            N'Đơn hàng được tạo thành công.' AS Message;
            
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
