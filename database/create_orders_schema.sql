-- =======================================================
-- SCHEMA & THỦ TỤC LƯU TRỮ PHÂN HỆ 4: ĐẶT HÀNG & KHUYẾN MÃI
-- SYSTEM-VERSIONED TEMPORAL TABLE & DATA INTEGRITY
-- =======================================================

USE DOAN_H;
GO

-- 1. Tạo bảng Promotions (Mã Khuyến Mãi) nếu chưa tồn tại
IF OBJECT_ID('Promotions', 'U') IS NULL
BEGIN
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
    PRINT 'Da tao bang Promotions.';
END;
GO

-- 2. Tạo bảng Orders (Hóa Đơn) nếu chưa tồn tại
IF OBJECT_ID('Orders', 'U') IS NULL
BEGIN
    CREATE TABLE Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        OrderDate DATETIME DEFAULT GETDATE(),
        TotalAmount DECIMAL(18,2) NOT NULL, -- Giá trị giỏ hàng trước giảm giá
        DiscountAmount DECIMAL(18,2) DEFAULT 0, -- Số tiền được giảm giá
        ShippingFee DECIMAL(18,2) NOT NULL DEFAULT 0, -- Phí vận chuyển
        FinalAmount DECIMAL(18,2) NOT NULL, -- Tiền khách thực tế cần thanh toán
        PromotionID INT NULL,
        Status NVARCHAR(50) DEFAULT N'Chờ xác nhận', -- Chờ xác nhận, Đang giao, Hoàn thành, Đã hủy
        ShippingAddress NVARCHAR(255) NOT NULL,
        Latitude DECIMAL(9,6) NULL,
        Longitude DECIMAL(9,6) NULL,
        PaymentMethod NVARCHAR(50) NOT NULL, -- COD, VNPAY
        PaymentStatus NVARCHAR(50) DEFAULT N'Chưa thanh toán', -- Chưa thanh toán, Đã thanh toán, Thất bại
        CONSTRAINT FK_Orders_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Orders_Promotions FOREIGN KEY (PromotionID) REFERENCES Promotions(PromotionID)
    );
    PRINT 'Da tao bang Orders.';
END;
GO

-- 3. Tạo bảng OrderDetails (Chi Tiết Hóa Đơn) nếu chưa tồn tại
IF OBJECT_ID('OrderDetails', 'U') IS NULL
BEGIN
    CREATE TABLE OrderDetails (
        OrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        ProductID INT NOT NULL,
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(18,2) NOT NULL,
        CONSTRAINT FK_OrderDetails_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
        CONSTRAINT FK_OrderDetails_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
    );
    PRINT 'Da tao bang OrderDetails.';
END;
GO

-- 4. Xóa và Tạo lại Stored Procedure sp_TaoHoaDon
IF OBJECT_ID('sp_TaoHoaDon', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE sp_TaoHoaDon;
    PRINT 'Da xoa Stored Procedure sp_TaoHoaDon cu.';
END;
GO

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
PRINT 'Da tao Stored Procedure sp_TaoHoaDon.';
GO

-- 5. Xóa và Tạo Trigger trg_ChiTietHoaDon_Insert (Trừ kho)
IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_ChiTietHoaDon_Insert')
BEGIN
    DROP TRIGGER trg_ChiTietHoaDon_Insert;
END;
GO

CREATE TRIGGER trg_ChiTietHoaDon_Insert
ON OrderDetails
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE Products
    SET Inventory = Products.Inventory - inserted.Quantity
    FROM Products
    INNER JOIN inserted ON Products.ProductID = inserted.ProductID;
END;
GO
PRINT 'Da tao Trigger trg_ChiTietHoaDon_Insert.';
GO

-- 6. Xóa và Tạo Trigger trg_HoaDon_UpdateStatus (Hoàn kho & hoàn lượt dùng voucher khi HỦY ĐƠN)
IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_HoaDon_UpdateStatus')
BEGIN
    DROP TRIGGER trg_HoaDon_UpdateStatus;
END;
GO

CREATE TRIGGER trg_HoaDon_UpdateStatus
ON Orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Chỉ kích hoạt khi trạng thái chuyển từ bất kỳ sang 'Đã hủy'
    IF EXISTS (
        SELECT 1 
        FROM inserted i 
        INNER JOIN deleted d ON i.OrderID = d.OrderID 
        WHERE i.Status = N'Đã hủy' AND d.Status <> N'Đã hủy'
    )
    BEGIN
        -- 1. Khôi phục số lượng kho cho các mặt hàng trong đơn
        UPDATE p
        SET p.Inventory = p.Inventory + od.Quantity
        FROM Products p
        INNER JOIN OrderDetails od ON p.ProductID = od.ProductID
        INNER JOIN inserted i ON od.OrderID = i.OrderID
        INNER JOIN deleted d ON i.OrderID = d.OrderID
        WHERE i.Status = N'Đã hủy' AND d.Status <> N'Đã hủy';

        -- 2. Hoàn lại 1 lượt dùng cho mã khuyến mãi (nếu có sử dụng)
        UPDATE Promotions
        SET UsedCount = CASE WHEN UsedCount > 0 THEN UsedCount - 1 ELSE 0 END
        FROM Promotions pr
        INNER JOIN inserted i ON pr.PromotionID = i.PromotionID
        INNER JOIN deleted d ON i.OrderID = d.OrderID
        WHERE i.Status = N'Đã hủy' AND d.Status <> N'Đã hủy';
    END;
END;
GO
PRINT 'Da tao Trigger trg_HoaDon_UpdateStatus.';
GO

-- 7. Seed dữ liệu mã khuyến mãi mẫu nếu chưa tồn tại
MERGE INTO Promotions AS target
USING (VALUES 
    ('VOUCHER10', N'Giảm 10% tối đa 50K cho đơn từ 100K', 10, 50000.00, 100000.00, 100, 0, '2026-01-01', '2028-12-31'),
    ('GIAMGIA50', N'Giảm 50% tối đa 100K cho đơn từ 50K (Hạn chế 5 lượt)', 50, 100000.00, 50000.00, 5, 0, '2026-01-01', '2028-12-31')
) AS source (PromoCode, Description, DiscountPercentage, MaxDiscountAmount, MinOrderValue, UsageLimit, UsedCount, StartDate, EndDate)
ON target.PromoCode = source.PromoCode
WHEN NOT MATCHED THEN
    INSERT (PromoCode, Description, DiscountPercentage, MaxDiscountAmount, MinOrderValue, UsageLimit, UsedCount, StartDate, EndDate)
    VALUES (source.PromoCode, source.Description, source.DiscountPercentage, source.MaxDiscountAmount, source.MinOrderValue, source.UsageLimit, source.UsedCount, source.StartDate, source.EndDate);
GO
PRINT 'Da napa du lieu seed cho table Promotions.';
GO
