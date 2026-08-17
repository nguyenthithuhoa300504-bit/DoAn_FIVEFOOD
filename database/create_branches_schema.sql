USE DOAN_H;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Branches]') AND type in (N'U'))
BEGIN
    CREATE TABLE Branches (
        BranchID INT IDENTITY(1,1) PRIMARY KEY,
        BranchName NVARCHAR(150) NOT NULL UNIQUE,
        Latitude DECIMAL(9,6) NOT NULL,
        Longitude DECIMAL(9,6) NOT NULL,
        Address NVARCHAR(255) NULL,
        CoverageRadius INT DEFAULT 5, -- Bán kính giao hàng (km)
        Description NVARCHAR(255) NULL,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Da tao bang Branches.';
    
    -- Insert default branches so the map is not empty
    INSERT INTO Branches (BranchName, Latitude, Longitude, Address, CoverageRadius, Description)
    VALUES 
    (N'🏝️ Chi Nhánh Đặc Biệt Hải Đảo Phú Quý', 10.5220, 108.9410, N'Đảo Phú Quý, Bình Thuận', 3, N'Bếp chi nhánh Đảo Phú Quý • Phục vụ du khách & dân đảo (Bán kính 3km) • Đảm bảo giao nóng 15 phút'),
    (N'🏢 Chi Nhánh Nam Bình Thuận (La Gi)', 10.7250, 107.7650, N'Thị xã La Gi, Bình Thuận', 4, N'Bếp trung tâm thị xã La Gi • Phục vụ nội thị & dải ven biển (Bán kính 4.5km)'),
    (N'🏢 Chi Nhánh Bắc Bình Thuận (Tuy Phong)', 11.2380, 108.7200, N'Huyện Tuy Phong, Bình Thuận', 4, N'Bếp liên khu vực Vĩnh Hảo - Liên Hương • Đội xe dịch vụ địa phương (Bán kính 4km)'),
    (N'🏢 Chi Nhánh Trung Tâm (Phan Thiết)', 10.9333, 108.1000, N'Phan Thiết, Bình Thuận', 10, N'Bếp trung tâm • Giao hàng toàn thành phố');
    PRINT 'Da them du lieu mau cho bang Branches.';
END
ELSE
BEGIN
    PRINT 'Bang Branches da ton tai.';
END
GO
