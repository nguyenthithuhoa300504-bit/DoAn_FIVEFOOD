CREATE TABLE UserActionLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ActionType NVARCHAR(50) NOT NULL, -- VIEW_PRODUCT, ADD_TO_CART, FAVORITE_PRODUCT, SEARCH
    ProductID INT NULL, -- NULL nếu hành động là SEARCH
    SearchQuery NVARCHAR(255) NULL, -- Lưu từ khóa tìm kiếm (nếu có)
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_UserActionLogs_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_UserActionLogs_Products FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);
GO
