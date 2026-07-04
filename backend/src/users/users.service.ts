import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class UsersService {
  constructor(private dbService: DatabaseService) {}

  async findByEmail(email: string) {
    const result = await this.dbService.query(
      `SELECT u.*, r.RoleName 
       FROM Users u 
       INNER JOIN Roles r ON u.RoleID = r.RoleID 
       WHERE u.Email = @Email`,
      [{ name: 'Email', type: sql.VarChar(100), value: email }]
    );
    return result.recordset[0] || null;
  }

  async findById(id: number) {
    const result = await this.dbService.query(
      `SELECT u.UserID, u.FullName, u.Email, u.Phone, u.IsLocked, u.CreatedAt, r.RoleName 
       FROM Users u 
       INNER JOIN Roles r ON u.RoleID = r.RoleID 
       WHERE u.UserID = @UserID`,
      [{ name: 'UserID', type: sql.Int, value: id }]
    );
    return result.recordset[0] || null;
  }

  async createUser(fullName: string, email: string, phone: string, passwordHash: string, roleName: string = 'Client') {
    // 1. Tìm hoặc tự tạo RoleID nếu chưa có sẵn trong DB
    let roleResult = await this.dbService.query(
      `SELECT RoleID FROM Roles WHERE RoleName = @RoleName`,
      [{ name: 'RoleName', type: sql.NVarChar(50), value: roleName }]
    );

    let roleId = roleResult.recordset[0]?.RoleID;

    if (!roleId) {
      const insertRole = await this.dbService.query(
        `INSERT INTO Roles (RoleName) OUTPUT inserted.RoleID VALUES (@RoleName)`,
        [{ name: 'RoleName', type: sql.NVarChar(50), value: roleName }]
      );
      roleId = insertRole.recordset[0].RoleID;
    }

    // 2. Tạo tài khoản người dùng mới
    const result = await this.dbService.query(
      `INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleID, IsLocked) 
       OUTPUT inserted.UserID, inserted.FullName, inserted.Email, inserted.Phone
       VALUES (@FullName, @Email, @Phone, @PasswordHash, @RoleID, 0)`,
      [
        { name: 'FullName', type: sql.NVarChar(100), value: fullName },
        { name: 'Email', type: sql.VarChar(100), value: email },
        { name: 'Phone', type: sql.VarChar(15), value: phone },
        { name: 'PasswordHash', type: sql.VarChar(255), value: passwordHash },
        { name: 'RoleID', type: sql.Int, value: roleId }
      ]
    );

    return result.recordset[0];
  }

  /**
   * Cập nhật thông tin cá nhân
   */
  async updateProfile(id: number, fullName: string, phone: string) {
    const result = await this.dbService.query(
      `UPDATE Users 
       SET FullName = @FullName, Phone = @Phone 
       OUTPUT inserted.UserID, inserted.FullName, inserted.Email, inserted.Phone
       WHERE UserID = @UserID`,
      [
        { name: 'UserID', type: sql.Int, value: id },
        { name: 'FullName', type: sql.NVarChar(100), value: fullName },
        { name: 'Phone', type: sql.VarChar(15), value: phone }
      ]
    );
    return result.recordset[0] || null;
  }

  /**
   * Cập nhật mật khẩu mới
   */
  async updatePassword(id: number, passwordHash: string) {
    await this.dbService.query(
      `UPDATE Users 
       SET PasswordHash = @PasswordHash 
       WHERE UserID = @UserID`,
      [
        { name: 'UserID', type: sql.Int, value: id },
        { name: 'PasswordHash', type: sql.VarChar(255), value: passwordHash }
      ]
    );
    return true;
  }

  /**
   * Lấy danh sách toàn bộ người dùng kèm phân trang (Admin)
   */
  async getUsers(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const result = await this.dbService.query(
      `SELECT u.UserID, u.FullName, u.Email, u.Phone, u.IsLocked, u.CreatedAt, r.RoleName, COUNT(*) OVER() as TotalCount
       FROM Users u
       INNER JOIN Roles r ON u.RoleID = r.RoleID
       ORDER BY u.UserID DESC
       OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY`,
      [
        { name: 'Offset', type: sql.Int, value: offset },
        { name: 'Limit', type: sql.Int, value: limit }
      ]
    );

    const users = result.recordset;
    const totalCount = users.length > 0 ? users[0].TotalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      users,
      pagination: {
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Khóa hoặc mở khóa tài khoản người dùng (Admin)
   */
  async toggleLock(id: number, isLocked: boolean) {
    const result = await this.dbService.query(
      `UPDATE Users 
       SET IsLocked = @IsLocked 
       OUTPUT inserted.UserID, inserted.FullName, inserted.Email, inserted.IsLocked
       WHERE UserID = @UserID`,
      [
        { name: 'UserID', type: sql.Int, value: id },
        { name: 'IsLocked', type: sql.Bit, value: isLocked }
      ]
    );
    return result.recordset[0] || null;
  }
}
