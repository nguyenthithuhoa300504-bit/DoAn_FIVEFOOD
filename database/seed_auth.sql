-- =======================================================
-- SCRIPT NẠP DỮ LIỆU MẪU PHÂN HỆ 1 (AUTH & USERS) - FIVEFOOD
-- Mật khẩu đăng nhập mặc định cho tất cả các tài khoản: 123456
-- =======================================================

USE DOAN_H;
GO

-- 1. Xóa dữ liệu cũ nếu tồn tại để tránh trùng lặp
DELETE FROM Users;
DELETE FROM Roles;
GO

-- 2. Nạp dữ liệu bảng Roles (Vai trò)
SET IDENTITY_INSERT Roles ON;
INSERT INTO Roles (RoleID, RoleName) VALUES 
(1, N'Admin'),
(2, N'Client'),
(3, N'Shipper');
SET IDENTITY_INSERT Roles OFF;
GO

-- 3. Nạp dữ liệu bảng Users (Người dùng)
-- Mật khẩu hashed bên dưới tương ứng với password: '123456'
SET IDENTITY_INSERT Users ON;
INSERT INTO Users (UserID, FullName, Email, Phone, PasswordHash, RoleID, IsLocked, CreatedAt) VALUES 
(1, N'Quản Trị Viên Hệ Thống', 'admin@fivefood.com', '0901234567', '$2b$10$GmytK/PcFGgCqw9mQbtgB.m3cN0or4MlDHu1QpIk5x25E88rKpON.', 1, 0, GETDATE()),
(2, N'Nguyễn Văn Khách Hàng', 'client@fivefood.com', '0912345678', '$2b$10$GmytK/PcFGgCqw9mQbtgB.m3cN0or4MlDHu1QpIk5x25E88rKpON.', 2, 0, GETDATE()),
(3, N'Trần Văn Tài Xế', 'shipper@fivefood.com', '0923456789', '$2b$10$GmytK/PcFGgCqw9mQbtgB.m3cN0or4MlDHu1QpIk5x25E88rKpON.', 3, 0, GETDATE());
SET IDENTITY_INSERT Users OFF;
GO

-- 4. Kiểm tra lại dữ liệu vừa nạp
SELECT u.UserID, u.FullName, u.Email, u.Phone, r.RoleName, u.IsLocked
FROM Users u
INNER JOIN Roles r ON u.RoleID = r.RoleID;
GO
