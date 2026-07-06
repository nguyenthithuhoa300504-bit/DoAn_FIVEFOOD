-- =======================================================
-- SCRIPT NẠP DỮ LIỆU MẪU PHÂN HỆ 4 (ORDERS & PROMOTIONS) - FIVEFOOD
-- Cung cấp lịch sử đơn hàng mẫu và voucher để kiểm thử E2E
-- =======================================================

USE DOAN_H;
GO

-- 1. Đảm bảo tồn kho của các sản phẩm mẫu đủ lớn trước khi tạo đơn hàng mẫu
UPDATE Products SET Inventory = 50 WHERE ProductID IN (1, 2, 3, 4);
PRINT 'Da cap nhat ton kho cac san pham len 50 de tranh thieu hang.';
GO

-- 2. Xóa sạch đơn hàng cũ để nạp dữ liệu sạch
DELETE FROM OrderDetails;
DELETE FROM Orders;
DELETE FROM Promotions;
GO

-- 3. Nạp dữ liệu bảng Promotions (Voucher khuyến mãi)
SET IDENTITY_INSERT Promotions ON;
INSERT INTO Promotions (PromotionID, PromoCode, Description, DiscountPercentage, MaxDiscountAmount, MinOrderValue, UsageLimit, UsedCount, StartDate, EndDate) VALUES
(1, 'VOUCHER10', N'Giảm 10% tối đa 50K cho đơn hàng từ 100K', 10, 50000.00, 100000.00, 100, 2, '2026-01-01', '2028-12-31'),
(2, 'GIAMGIA50', N'Giảm 50% tối đa 100K cho đơn hàng từ 50K', 50, 100000.00, 50000.00, 5, 1, '2026-01-01', '2028-12-31');
SET IDENTITY_INSERT Promotions OFF;
PRINT 'Da nap du lieu seed cho bang Promotions.';
GO

-- 4. Nạp dữ liệu bảng Orders (Các hóa đơn mẫu cho UserID = 2 - client@fivefood.com)
SET IDENTITY_INSERT Orders ON;
INSERT INTO Orders (
    OrderID, UserID, OrderDate, TotalAmount, DiscountAmount, ShippingFee, FinalAmount, 
    PromotionID, Status, ShippingAddress, Latitude, Longitude, PaymentMethod, PaymentStatus
) VALUES
-- Đơn hàng 1: Đã hoàn thành (COD, đã thanh toán)
(1, 2, DATEADD(day, -3, GETDATE()), 70000.00, 0.00, 15000.00, 85000.00, 
 NULL, N'Hoàn thành', N'123 Đường Láng, Đống Đa, Hà Nội', 21.0189, 105.8083, 'COD', N'Đã thanh toán'),

-- Đơn hàng 2: Đang giao (VNPAY, đã thanh toán)
(2, 2, DATEADD(hour, -2, GETDATE()), 129000.00, 0.00, 20000.00, 149000.00, 
 NULL, N'Đang giao', N'456 Kim Mã, Ba Đình, Hà Nội', 21.0319, 105.8122, 'VNPAY', N'Đã thanh toán'),

-- Đơn hàng 3: Chờ xác nhận (COD, chưa thanh toán, sử dụng voucher VOUCHER10)
(3, 2, DATEADD(minute, -20, GETDATE()), 130000.00, 13000.00, 15000.00, 132000.00, 
 1, N'Chờ xác nhận', N'789 Giải Phóng, Hoàng Mai, Hà Nội', 20.9856, 105.8427, 'COD', N'Chưa thanh toán'),

-- Đơn hàng 4: Đã hủy (VNPAY, thất bại, sử dụng voucher GIAMGIA50)
(4, 2, DATEADD(day, -1, GETDATE()), 258000.00, 100000.00, 20000.00, 178000.00, 
 2, N'Đã hủy', N'10 Hoàn Kiếm, Hà Nội', 21.0285, 105.8521, 'VNPAY', N'Thất bại');
SET IDENTITY_INSERT Orders OFF;
PRINT 'Da nap du lieu seed cho bang Orders.';
GO

-- 5. Nạp dữ liệu bảng OrderDetails (Chi tiết các hóa đơn mẫu tương ứng)
SET IDENTITY_INSERT OrderDetails ON;
INSERT INTO OrderDetails (OrderDetailID, OrderID, ProductID, Quantity, UnitPrice) VALUES
-- Chi tiết Đơn hàng 1 (Tổng hàng: 70k)
(1, 1, 1, 1, 25000.00), -- 1 Bánh mì (25k)
(2, 1, 2, 1, 45000.00), -- 1 Phở Bò (45k)

-- Chi tiết Đơn hàng 2 (Tổng hàng: 129k)
(3, 2, 3, 1, 129000.00), -- 1 Pizza Hải Sản (129k)

-- Chi tiết Đơn hàng 3 (Tổng hàng: 130k)
(4, 3, 1, 4, 25000.00), -- 4 Bánh mì (100k)
(5, 3, 4, 1, 30000.00), -- 1 Trà sữa (30k)

-- Chi tiết Đơn hàng 4 (Tổng hàng: 258k)
(6, 4, 3, 2, 129000.00); -- 2 Pizza (258k)
SET IDENTITY_INSERT OrderDetails OFF;
PRINT 'Da nap du lieu seed cho bang OrderDetails.';
GO

-- 6. Hiển thị danh sách hóa đơn vừa nạp để kiểm tra
SELECT o.OrderID, o.OrderDate, o.TotalAmount, o.DiscountAmount, o.ShippingFee, o.FinalAmount, 
       o.Status, o.PaymentMethod, o.PaymentStatus, p.PromoCode
FROM Orders o
LEFT JOIN Promotions p ON o.PromotionID = p.PromotionID
WHERE o.UserID = 2;
GO
