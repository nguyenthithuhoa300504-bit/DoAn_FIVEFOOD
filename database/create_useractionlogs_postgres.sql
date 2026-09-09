CREATE TABLE useractionlogs (
    LogID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    ActionType VARCHAR(50) NOT NULL,
    ProductID INT NULL,
    SearchQuery VARCHAR(255) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_UserActionLogs_Users FOREIGN KEY (UserID) REFERENCES users(UserID),
    CONSTRAINT FK_UserActionLogs_Products FOREIGN KEY (ProductID) REFERENCES products(ProductID)
);
