-- =======================================================
-- SCRIPT TẠO BẢNG NOTIFICATIONS & CHATMESSAGES - FIVEFOOD
-- =======================================================

USE DOAN_H;
GO

-- 1. Tạo bảng Notifications (Thông báo)
IF OBJECT_ID('Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE Notifications (
        NotificationID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        IsRead BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
    );
    PRINT 'Da tao bang Notifications thanh cong.';
END
ELSE
BEGIN
    PRINT 'Bang Notifications da ton tai.';
END;
GO

-- 2. Tạo bảng ChatMessages (Tin nhắn Hỗ trợ)
IF OBJECT_ID('ChatMessages', 'U') IS NULL
BEGIN
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
    PRINT 'Da tao bang ChatMessages thanh cong.';
END
ELSE
BEGIN
    PRINT 'Bang ChatMessages da ton tai.';
END;
GO
