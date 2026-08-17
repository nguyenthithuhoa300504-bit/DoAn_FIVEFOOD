USE DOAN_H;
GO

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'IsHeadquarters' AND Object_ID = Object_ID(N'dbo.Branches'))
BEGIN
    ALTER TABLE Branches ADD IsHeadquarters BIT DEFAULT 0;
END
GO

UPDATE Branches SET IsHeadquarters = 1 WHERE BranchID = 4; -- Phan Thiết is HQ
UPDATE Branches SET IsHeadquarters = 0 WHERE BranchID <> 4;
GO
