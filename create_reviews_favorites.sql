-- =======================================================
-- SCRIPT TẠO BẢNG REVIEWS & FAVORITES - FIVEFOOD
-- =======================================================

USE DOAN_H;
GO

-- 1. Tạo bảng Favorites nếu chưa tồn tại
IF OBJECT_ID('Favorites', 'U') IS NULL
BEGIN
    CREATE TABLE Favorites (
        FavoriteID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ProductID INT NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Favorites_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
        CONSTRAINT FK_Favorites_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
        CONSTRAINT UQ_User_Product_Fav UNIQUE (UserID, ProductID)
    );
    PRINT 'Da tao bang Favorites thanh cong.';
END
ELSE
BEGIN
    PRINT 'Bang Favorites da ton tai.';
END;
GO

-- 2. Tạo bảng Reviews nếu chưa tồn tại
IF OBJECT_ID('Reviews', 'U') IS NULL
BEGIN
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
    PRINT 'Da tao bang Reviews thanh cong.';
END
ELSE
BEGIN
    PRINT 'Bang Reviews da ton tai.';
END;
GO
