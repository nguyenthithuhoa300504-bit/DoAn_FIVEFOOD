-- =======================================================
-- SCRIPT N?P D? LI?U M?U PHÂN H? 1 (AUTH & USERS) - FIVEFOOD
-- M?t kh?u ??ng nh?p m?c ??nh cho t?t c? các tài kho?n: 123456
-- =======================================================

USE DOAN_H;
GO

-- 1. Xóa d? li?u c? n?u t?n t?i ?? tránh trùng l?p
DELETE FROM Users;
DELETE FROM Roles;
GO

-- 2. N?p d? li?u b?ng Roles (Vai trò)
SET IDENTITY_INSERT Roles ON;
INSERT INTO Roles (RoleID, RoleName) VALUES 
(1, N'Admin'),
(2, N'Client'),
(3, N'Shipper');
SET IDENTITY_INSERT Roles OFF;
GO

-- 3. N?p d? li?u b?ng Users (Ng??i dùng)
-- M?t kh?u hashed bên d??i t??ng ?ng v?i password: '123456'
SET IDENTITY_INSERT Users ON;
INSERT INTO Users (UserID, FullName, Email, Phone, PasswordHash, RoleID, IsLocked, CreatedAt) VALUES 
(1, N'Qu?n Tr? Viên H? Th?ng', 'admin@fivefood.com', '0901234567', '$2b$10$GmytK/PcFGgCqw9mQbtgB.m3cN0or4MlDHu1QpIk5x25E88rKpON.', 1, 0, GETDATE()),
(2, N'Nguy?n V?n Khách Hàng', 'client@fivefood.com', '0912345678', '$2b$10$GmytK/PcFGgCqw9mQbtgB.m3cN0or4MlDHu1QpIk5x25E88rKpON.', 2, 0, GETDATE()),
(3, N'Tr?n V?n Tài X?', 'shipper@fivefood.com', '0923456789', '$2b$10$GmytK/PcFGgCqw9mQbtgB.m3cN0or4MlDHu1QpIk5x25E88rKpON.', 3, 0, GETDATE());
SET IDENTITY_INSERT Users OFF;
GO

-- 4. Ki?m tra l?i d? li?u v?a n?p
SELECT u.UserID, u.FullName, u.Email, u.Phone, r.RoleName, u.IsLocked
FROM Users u
INNER JOIN Roles r ON u.RoleID = r.RoleID;
GO
