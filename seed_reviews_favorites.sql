-- =======================================================
-- SCRIPT NẠP DỮ LIỆU MẪU (SEED DATA) PHÂN HỆ 8 - FIVEFOOD
-- (Chạy sau khi đã chạy create_reviews_favorites.sql)
-- =======================================================

USE DOAN_H;
GO

-- Xóa dữ liệu cũ nếu có để tránh lỗi trùng lặp khi chạy lại nhiều lần
DELETE FROM Reviews;
DELETE FROM Favorites;
GO

-- ==============================================
-- 1. Nạp dữ liệu mẫu cho bảng Favorites (Yêu thích)
-- Giả định UserID = 2 (tài khoản khách hàng) đã tồn tại
-- ProductID 1 (Bánh mì), ProductID 3 (Pizza), ProductID 4 (Trà sữa)
-- ==============================================
BEGIN TRY
    INSERT INTO Favorites (UserID, ProductID, CreatedAt) VALUES 
    (2, 1, GETDATE()), -- Khách hàng yêu thích Bánh Mì
    (2, 3, GETDATE()), -- Khách hàng yêu thích Pizza
    (2, 4, GETDATE()); -- Khách hàng yêu thích Trà Sữa
    PRINT 'Da nap du lieu mau cho bang Favorites.';
END TRY
BEGIN CATCH
    PRINT 'Loi khi nap Favorites (co the do UserID=2 chua ton tai hoac sai rang buoc): ' + ERROR_MESSAGE();
END CATCH
GO

-- ==============================================
-- 2. Chuẩn bị dữ liệu Đơn hàng để Đánh giá (Reviews)
-- Để đánh giá hợp lệ, cần có 1 đơn hàng trạng thái "Hoàn thành"
-- chứa món ăn mà khách muốn đánh giá.
-- ==============================================

-- Bật IDENTITY_INSERT để chèn cứng OrderID = 9999 (tránh xung đột với đơn thật)
SET IDENTITY_INSERT Orders ON;
BEGIN TRY
    INSERT INTO Orders (OrderID, UserID, OrderDate, TotalAmount, DiscountAmount, FinalAmount, Status, ShippingAddress, Latitude, Longitude, PaymentMethod, PaymentStatus)
    VALUES 
    (9999, 2, DATEADD(day, -2, GETDATE()), 199000.00, 0, 199000.00, N'Hoàn thành', N'123 Đường Số 1, Quận 1', 10.7769, 106.7009, 'COD', N'Đã thanh toán');
END TRY
BEGIN CATCH
    -- Nếu OrderID 9999 đã tồn tại, không làm gì cả
END CATCH
SET IDENTITY_INSERT Orders OFF;
GO

-- Chèn chi tiết món ăn vào Đơn hàng 9999
BEGIN TRY
    -- Xóa chi tiết cũ nếu chạy lại script
    DELETE FROM OrderDetails WHERE OrderID = 9999; 
    
    INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice)
    VALUES 
    (9999, 1, 2, 25000.00), -- Mua 2 Bánh mì
    (9999, 3, 1, 129000.00); -- Mua 1 Pizza
END TRY
BEGIN CATCH
END CATCH
GO

-- ==============================================
-- 3. Nạp dữ liệu mẫu cho bảng Reviews (Đánh giá)
-- Đánh giá Bánh mì và Pizza trong đơn hàng 9999
-- ==============================================
BEGIN TRY
    INSERT INTO Reviews (UserID, ProductID, OrderID, Rating, Comment, CreatedAt)
    VALUES 
    (2, 1, 9999, 5, N'Bánh mì siêu ngon, thịt nướng thơm phức! Rất đáng tiền.', DATEADD(day, -1, GETDATE())),
    (2, 3, 9999, 4, N'Pizza giao đến vẫn còn nóng, viền phô mai rất béo ngậy. Sẽ ủng hộ lại.', DATEADD(day, -1, GETDATE()));
    
    PRINT 'Da nap du lieu mau cho bang Reviews.';
END TRY
BEGIN CATCH
    PRINT 'Loi khi nap Reviews: ' + ERROR_MESSAGE();
END CATCH
GO

-- ==============================================
-- 4. KẾT QUẢ KIỂM TRA
-- ==============================================
SELECT 'Favorites' AS TableName, COUNT(*) AS TotalRows FROM Favorites;
SELECT 'Reviews' AS TableName, COUNT(*) AS TotalRows FROM Reviews;
GO
