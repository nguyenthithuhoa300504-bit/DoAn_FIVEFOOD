-- =========================================================================
-- HỆ THỐNG ĐẶT VÀ GIAO ĐỒ ĂN TRỰC TUYẾN FIVEFOOD
-- FILE SQL SCHEMA POSTGRESQL (SUPABASE)
-- =========================================================================

-- ==========================================
-- 1. XÓA BẢNG VÀ LOGIC CŨ (NẾU CÓ)
-- ==========================================
DROP VIEW IF EXISTS v_SanPhamBanChay CASCADE;
DROP VIEW IF EXISTS v_RecommendedProducts CASCADE;
DROP FUNCTION IF EXISTS sp_TaoHoaDon CASCADE;
DROP TRIGGER IF EXISTS trg_HoaDon_UpdateStatus ON Orders CASCADE;
DROP TRIGGER IF EXISTS trg_ChiTietHoaDon_Insert ON OrderDetails CASCADE;
DROP FUNCTION IF EXISTS fn_UpdateStatus_HoaDon CASCADE;
DROP FUNCTION IF EXISTS fn_Insert_ChiTietHoaDon CASCADE;
DROP TRIGGER IF EXISTS trg_Products_History ON Products CASCADE;
DROP FUNCTION IF EXISTS fn_Products_History CASCADE;

DROP TABLE IF EXISTS ChatbotLogs CASCADE;
DROP TABLE IF EXISTS ChatMessages CASCADE;
DROP TABLE IF EXISTS Notifications CASCADE;
DROP TABLE IF EXISTS Reviews CASCADE;
DROP TABLE IF EXISTS Favorites CASCADE;
DROP TABLE IF EXISTS DeliveryTrips CASCADE;
DROP TABLE IF EXISTS Shippers CASCADE;
DROP TABLE IF EXISTS Transactions CASCADE;
DROP TABLE IF EXISTS OrderDetails CASCADE;
DROP TABLE IF EXISTS Orders CASCADE;
DROP TABLE IF EXISTS Promotions CASCADE;
DROP TABLE IF EXISTS CartItems CASCADE;
DROP TABLE IF EXISTS ProductsHistory CASCADE;
DROP TABLE IF EXISTS Products CASCADE;
DROP TABLE IF EXISTS Categories CASCADE;
DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS Roles CASCADE;

-- ==========================================
-- 2. KHỞI TẠO BẢNG DỮ LIỆU
-- ==========================================

-- Bảng Roles (Vai trò người dùng)
CREATE TABLE Roles (
    RoleID SERIAL PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL UNIQUE
);

-- Bảng Users (Tài khoản người dùng)
CREATE TABLE Users (
    UserID SERIAL PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Phone VARCHAR(15) NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    RoleID INT NOT NULL,
    IsLocked BOOLEAN DEFAULT FALSE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

-- Bảng Categories (Danh mục sản phẩm)
CREATE TABLE Categories (
    CategoryID SERIAL PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE,
    Description VARCHAR(255) NULL,
    ImageURL VARCHAR(255) NULL
);

-- Bảng Products
CREATE TABLE Products (
    ProductID SERIAL PRIMARY KEY,
    ProductName VARCHAR(150) NOT NULL,
    CategoryID INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Inventory INT NOT NULL DEFAULT 0,
    ImageURL VARCHAR(255) NULL,
    Ingredients VARCHAR(500) NULL,
    Description TEXT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    SysStartTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    SysEndTime TIMESTAMP DEFAULT '9999-12-31 23:59:59' NOT NULL,
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

-- Bảng lưu lịch sử giá (Thay thế System Versioning)
CREATE TABLE ProductsHistory (
    HistoryID SERIAL PRIMARY KEY,
    ProductID INT NOT NULL,
    ProductName VARCHAR(150) NOT NULL,
    CategoryID INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Inventory INT NOT NULL,
    ImageURL VARCHAR(255) NULL,
    Ingredients VARCHAR(500) NULL,
    Description TEXT NULL,
    IsActive BOOLEAN,
    SysStartTime TIMESTAMP NOT NULL,
    SysEndTime TIMESTAMP NOT NULL
);

-- Bảng CartItems
CREATE TABLE CartItems (
    CartItemID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    ProductID INT NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_CartItems_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_CartItems_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
    CONSTRAINT UQ_User_Product_Cart UNIQUE (UserID, ProductID)
);

-- Bảng Promotions
CREATE TABLE Promotions (
    PromotionID SERIAL PRIMARY KEY,
    PromoCode VARCHAR(50) NOT NULL UNIQUE,
    Description VARCHAR(255) NULL,
    DiscountPercentage INT NOT NULL CHECK (DiscountPercentage BETWEEN 1 AND 100),
    MaxDiscountAmount DECIMAL(18,2) NOT NULL,
    MinOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0,
    UsageLimit INT NOT NULL,
    UsedCount INT DEFAULT 0,
    StartDate TIMESTAMP NOT NULL,
    EndDate TIMESTAMP NOT NULL
);

-- Bảng Orders
CREATE TABLE Orders (
    OrderID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    OrderDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TotalAmount DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) DEFAULT 0,
    ShippingFee DECIMAL(18,2) NOT NULL DEFAULT 0,
    FinalAmount DECIMAL(18,2) NOT NULL,
    PromotionID INT NULL,
    Status VARCHAR(50) DEFAULT 'Chờ xác nhận',
    ShippingAddress VARCHAR(255) NOT NULL,
    Latitude DECIMAL(9,6) NULL,
    Longitude DECIMAL(9,6) NULL,
    PaymentMethod VARCHAR(50) NOT NULL,
    PaymentStatus VARCHAR(50) DEFAULT 'Chưa thanh toán',
    CONSTRAINT FK_Orders_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Orders_Promotions FOREIGN KEY (PromotionID) REFERENCES Promotions(PromotionID)
);

-- Bảng OrderDetails
CREATE TABLE OrderDetails (
    OrderDetailID SERIAL PRIMARY KEY,
    OrderID INT NOT NULL,
    ProductID INT NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_OrderDetails_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    CONSTRAINT FK_OrderDetails_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);

-- Bảng Transactions
CREATE TABLE Transactions (
    TransactionID SERIAL PRIMARY KEY,
    OrderID INT NOT NULL,
    PaymentGateway VARCHAR(50) NOT NULL,
    TransactionNo VARCHAR(100) NOT NULL UNIQUE,
    Amount DECIMAL(18,2) NOT NULL,
    Status VARCHAR(50) NOT NULL,
    ResponseCode VARCHAR(10) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Transactions_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);

-- Bảng Shippers
CREATE TABLE Shippers (
    ShipperID SERIAL PRIMARY KEY,
    ShipperName VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) NOT NULL,
    VehicleNumber VARCHAR(20) NULL,
    IsAvailable BOOLEAN DEFAULT TRUE
);

-- Bảng DeliveryTrips
CREATE TABLE DeliveryTrips (
    TripID SERIAL PRIMARY KEY,
    OrderID INT NOT NULL,
    ShipperID INT NOT NULL,
    StartTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    EndTime TIMESTAMP NULL,
    Status VARCHAR(50) DEFAULT 'Đang chuẩn bị',
    CONSTRAINT FK_DeliveryTrips_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    CONSTRAINT FK_DeliveryTrips_Shippers FOREIGN KEY (ShipperID) REFERENCES Shippers(ShipperID)
);

-- Bảng Favorites
CREATE TABLE Favorites (
    FavoriteID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    ProductID INT NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Favorites_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Favorites_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
    CONSTRAINT UQ_User_Product_Fav UNIQUE (UserID, ProductID)
);

-- Bảng Reviews
CREATE TABLE Reviews (
    ReviewID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    ProductID INT NOT NULL,
    OrderID INT NOT NULL,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment TEXT NULL,
    IsHidden BOOLEAN DEFAULT FALSE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Reviews_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Reviews_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
    CONSTRAINT FK_Reviews_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);

-- Bảng Notifications
CREATE TABLE Notifications (
    NotificationID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    Title VARCHAR(150) NOT NULL,
    Message TEXT NOT NULL,
    IsRead BOOLEAN DEFAULT FALSE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Bảng ChatMessages
CREATE TABLE ChatMessages (
    MessageID SERIAL PRIMARY KEY,
    SenderID INT NOT NULL,
    ReceiverID INT NOT NULL,
    MessageText TEXT NOT NULL,
    SentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    IsRead BOOLEAN DEFAULT FALSE,
    CONSTRAINT FK_ChatMessages_Sender FOREIGN KEY (SenderID) REFERENCES Users(UserID),
    CONSTRAINT FK_ChatMessages_Receiver FOREIGN KEY (ReceiverID) REFERENCES Users(UserID)
);

-- Bảng ChatbotLogs
CREATE TABLE ChatbotLogs (
    LogID SERIAL PRIMARY KEY,
    UserID INT NULL,
    SessionID VARCHAR(100) NOT NULL,
    ConversationData TEXT NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_ChatbotLogs_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- ==========================================
-- 3. KHỞI TẠO TRIGGERS
-- ==========================================

-- Trigger: Lịch sử Products
CREATE OR REPLACE FUNCTION fn_Products_History()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO ProductsHistory (ProductID, ProductName, CategoryID, Price, Inventory, ImageURL, Ingredients, Description, IsActive, SysStartTime, SysEndTime)
        VALUES (OLD.ProductID, OLD.ProductName, OLD.CategoryID, OLD.Price, OLD.Inventory, OLD.ImageURL, OLD.Ingredients, OLD.Description, OLD.IsActive, OLD.SysStartTime, CURRENT_TIMESTAMP);
        NEW.SysStartTime = CURRENT_TIMESTAMP;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO ProductsHistory (ProductID, ProductName, CategoryID, Price, Inventory, ImageURL, Ingredients, Description, IsActive, SysStartTime, SysEndTime)
        VALUES (OLD.ProductID, OLD.ProductName, OLD.CategoryID, OLD.Price, OLD.Inventory, OLD.ImageURL, OLD.Ingredients, OLD.Description, OLD.IsActive, OLD.SysStartTime, CURRENT_TIMESTAMP);
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_Products_History
BEFORE UPDATE OR DELETE ON Products
FOR EACH ROW EXECUTE FUNCTION fn_Products_History();

-- Trigger: Trừ kho khi Insert OrderDetails
CREATE OR REPLACE FUNCTION fn_Insert_ChiTietHoaDon()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Products
    SET Inventory = Inventory - NEW.Quantity
    WHERE ProductID = NEW.ProductID;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ChiTietHoaDon_Insert
AFTER INSERT ON OrderDetails
FOR EACH ROW EXECUTE FUNCTION fn_Insert_ChiTietHoaDon();

-- Trigger: Hoàn trả kho khi đơn hàng bị hủy
CREATE OR REPLACE FUNCTION fn_UpdateStatus_HoaDon()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.Status = 'Đã hủy' AND OLD.Status <> 'Đã hủy' THEN
        -- Hoàn trả tồn kho
        UPDATE Products p
        SET Inventory = Inventory + od.Quantity
        FROM OrderDetails od
        WHERE p.ProductID = od.ProductID AND od.OrderID = NEW.OrderID;
        
        -- Cộng lại lượt voucher
        IF NEW.PromotionID IS NOT NULL THEN
            UPDATE Promotions
            SET UsedCount = GREATEST(UsedCount - 1, 0)
            WHERE PromotionID = NEW.PromotionID;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_HoaDon_UpdateStatus
AFTER UPDATE ON Orders
FOR EACH ROW EXECUTE FUNCTION fn_UpdateStatus_HoaDon();

-- ==========================================
-- 4. KHỞI TẠO STORED PROCEDURE (SP ĐẶT HÀNG) -> FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION sp_TaoHoaDon(
    p_UserID INT,
    p_ShippingAddress VARCHAR(255),
    p_Latitude DECIMAL(9,6),
    p_Longitude DECIMAL(9,6),
    p_PaymentMethod VARCHAR(50),
    p_PromoCode VARCHAR(50) DEFAULT NULL,
    p_ShippingFee DECIMAL(18,2) DEFAULT 0
)
RETURNS TABLE (
    OrderID INT,
    FinalAmount DECIMAL(18,2),
    Message TEXT
) AS $$
DECLARE
    v_TotalAmount DECIMAL(18,2) := 0;
    v_DiscountAmount DECIMAL(18,2) := 0;
    v_FinalAmount DECIMAL(18,2) := 0;
    v_PromotionID INT := NULL;
    v_DiscountPercentage INT := 0;
    v_MaxDiscountAmount DECIMAL(18,2) := 0;
    v_MinOrderValue DECIMAL(18,2) := 0;
    v_UsageLimit INT := 0;
    v_UsedCount INT := 0;
    v_StartDate TIMESTAMP;
    v_EndDate TIMESTAMP;
    v_NewOrderID INT;
    v_ErrProdName VARCHAR(255);
BEGIN
    -- 1. Kiểm tra người dùng
    IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = p_UserID) THEN
        RAISE EXCEPTION 'Người dùng không tồn tại.';
    END IF;

    -- 2. Kiểm tra giỏ hàng
    IF NOT EXISTS (SELECT 1 FROM CartItems WHERE UserID = p_UserID) THEN
        RAISE EXCEPTION 'Giỏ hàng của bạn đang trống.';
    END IF;

    -- 3. Tính toán tổng tiền hàng
    SELECT COALESCE(SUM(c.Quantity * p.Price), 0) INTO v_TotalAmount
    FROM CartItems c
    INNER JOIN Products p ON c.ProductID = p.ProductID
    WHERE c.UserID = p_UserID;

    -- 4. Kiểm tra tồn kho
    SELECT p.ProductName INTO v_ErrProdName
    FROM CartItems c 
    INNER JOIN Products p ON c.ProductID = p.ProductID 
    WHERE c.UserID = p_UserID AND c.Quantity > p.Inventory
    LIMIT 1;

    IF v_ErrProdName IS NOT NULL THEN
        RAISE EXCEPTION 'Sản phẩm "%" không đủ hàng trong kho.', v_ErrProdName;
    END IF;

    -- 5. Áp dụng mã giảm giá
    IF p_PromoCode IS NOT NULL AND TRIM(p_PromoCode) <> '' THEN
        SELECT 
            PromotionID, DiscountPercentage, MaxDiscountAmount, MinOrderValue, UsageLimit, COALESCE(UsedCount, 0), StartDate, EndDate
        INTO 
            v_PromotionID, v_DiscountPercentage, v_MaxDiscountAmount, v_MinOrderValue, v_UsageLimit, v_UsedCount, v_StartDate, v_EndDate
        FROM Promotions
        WHERE PromoCode = p_PromoCode;

        IF v_PromotionID IS NULL THEN
            RAISE EXCEPTION 'Mã giảm giá không tồn tại.';
        END IF;

        IF CURRENT_TIMESTAMP < v_StartDate OR CURRENT_TIMESTAMP > v_EndDate THEN
            RAISE EXCEPTION 'Mã giảm giá đã hết hạn hoặc chưa đến ngày áp dụng.';
        END IF;

        IF v_UsedCount >= v_UsageLimit THEN
            RAISE EXCEPTION 'Mã giảm giá đã hết lượt sử dụng.';
        END IF;

        IF v_TotalAmount < v_MinOrderValue THEN
            RAISE EXCEPTION 'Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã.';
        END IF;

        v_DiscountAmount := (v_TotalAmount * v_DiscountPercentage) / 100.0;
        IF v_DiscountAmount > v_MaxDiscountAmount THEN
            v_DiscountAmount := v_MaxDiscountAmount;
        END IF;
    END IF;

    -- 6. Tính tổng tiền
    v_FinalAmount := v_TotalAmount - v_DiscountAmount + p_ShippingFee;
    IF v_FinalAmount < 0 THEN
        v_FinalAmount := 0;
    END IF;

    -- 7. Tạo hóa đơn
    INSERT INTO Orders (
        UserID, TotalAmount, DiscountAmount, ShippingFee, FinalAmount, 
        PromotionID, Status, ShippingAddress, Latitude, Longitude, PaymentMethod, PaymentStatus
    )
    VALUES (
        p_UserID, v_TotalAmount, v_DiscountAmount, p_ShippingFee, v_FinalAmount,
        v_PromotionID, 'Chờ xác nhận', p_ShippingAddress, p_Latitude, p_Longitude, p_PaymentMethod, 'Chưa thanh toán'
    ) RETURNING Orders.OrderID INTO v_NewOrderID;

    -- 8. Thêm chi tiết hóa đơn
    INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice)
    SELECT v_NewOrderID, c.ProductID, c.Quantity, p.Price
    FROM CartItems c
    INNER JOIN Products p ON c.ProductID = p.ProductID
    WHERE c.UserID = p_UserID;

    -- 9. Xóa giỏ hàng
    DELETE FROM CartItems WHERE UserID = p_UserID;

    -- 10. Tăng lượt dùng voucher
    IF v_PromotionID IS NOT NULL THEN
        UPDATE Promotions
        SET UsedCount = COALESCE(UsedCount, 0) + 1
        WHERE PromotionID = v_PromotionID;
    END IF;

    RETURN QUERY SELECT v_NewOrderID, v_FinalAmount, 'Đơn hàng được tạo thành công.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. VIEWS
-- ==========================================
CREATE OR REPLACE VIEW v_RecommendedProducts AS
SELECT UserID, ProductID, SUM(Quantity) AS TotalQuantityOrdered
FROM Orders o
INNER JOIN OrderDetails od ON o.OrderID = od.OrderID
WHERE o.Status = 'Hoàn thành'
GROUP BY UserID, ProductID;

CREATE OR REPLACE VIEW v_SanPhamBanChay AS
SELECT od.ProductID, p.ProductName, SUM(od.Quantity) AS TotalSold
FROM OrderDetails od
INNER JOIN Products p ON od.ProductID = p.ProductID
INNER JOIN Orders o ON od.OrderID = o.OrderID
WHERE o.Status = 'Hoàn thành'
GROUP BY od.ProductID, p.ProductName
ORDER BY TotalSold DESC
LIMIT 10;
