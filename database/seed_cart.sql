-- =======================================================
-- SCRIPT NẠP DỮ LIỆU MẪU PHÂN HỆ 3 (HYBRID CART) - FIVEFOOD
-- =======================================================

USE DOAN_H;
GO

-- 0. Tạo bảng CartItems nếu chưa tồn tại
IF OBJECT_ID('CartItems', 'U') IS NULL
BEGIN
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
    PRINT 'Da tao bang CartItems thanh cong.';
END
ELSE
BEGIN
    PRINT 'Bang CartItems da ton tai.';
END;
GO

-- 1. Đảm bảo các Danh mục (Categories) mẫu đã tồn tại
SET IDENTITY_INSERT Categories ON;
MERGE INTO Categories AS target
USING (VALUES 
    (1, N'Bánh mì', N'Các loại bánh mì kẹp giòn ngon'),
    (2, N'Bún Phở', N'Món nước truyền thống Việt Nam'),
    (3, N'Pizza', N'Pizza nướng củi thơm lừng phô mai'),
    (4, N'Đồ uống', N'Trà sữa, nước ngọt giải khát')
) AS source (CategoryID, CategoryName, Description)
ON target.CategoryID = source.CategoryID
WHEN MATCHED THEN
    UPDATE SET CategoryName = source.CategoryName, Description = source.Description
WHEN NOT MATCHED THEN
    INSERT (CategoryID, CategoryName, Description) VALUES (source.CategoryID, source.CategoryName, source.Description);
SET IDENTITY_INSERT Categories OFF;
GO

-- 2. Đảm bảo các Món ăn (Products) mẫu đã tồn tại
SET IDENTITY_INSERT Products ON;
MERGE INTO Products AS target
USING (VALUES 
    (1, N'Bánh Mì Thịt Nướng', 1, 25000.00, 10, '🥖', 1),
    (2, N'Phở Bò Đặc Biệt', 2, 45000.00, 5, '🍜', 1),
    (3, N'Pizza Hải Sản Viền Phô Mai', 3, 129000.00, 12, '🍕', 1),
    (4, N'Trà Sữa Thái Xanh Trân Châu', 4, 30000.00, 20, '🥤', 1)
) AS source (ProductID, ProductName, CategoryID, Price, Inventory, ImageURL, IsActive)
ON target.ProductID = source.ProductID
WHEN MATCHED THEN
    UPDATE SET ProductName = source.ProductName, CategoryID = source.CategoryID, Price = source.Price, Inventory = source.Inventory, ImageURL = source.ImageURL, IsActive = source.IsActive
WHEN NOT MATCHED THEN
    INSERT (ProductID, ProductName, CategoryID, Price, Inventory, ImageURL, IsActive) VALUES (source.ProductID, source.ProductName, source.CategoryID, source.Price, source.Inventory, source.ImageURL, source.IsActive);
SET IDENTITY_INSERT Products OFF;
GO

-- 3. Xóa các mặt hàng giỏ hàng cũ của tài khoản client@fivefood.com (UserID = 2) và nạp mẫu mới
DELETE FROM CartItems WHERE UserID = 2;
GO

INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) VALUES 
(2, 1, 2, GETDATE()), -- 2 Bánh mì
(2, 2, 1, GETDATE()); -- 1 Phở Bò
GO

-- 4. Hiển thị lại giỏ hàng mẫu để xác nhận thành công
SELECT c.UserID, u.Email, p.ProductName, c.Quantity, p.Price
FROM CartItems c
INNER JOIN Users u ON c.UserID = u.UserID
INNER JOIN Products p ON c.ProductID = p.ProductID
WHERE c.UserID = 2;
GO
