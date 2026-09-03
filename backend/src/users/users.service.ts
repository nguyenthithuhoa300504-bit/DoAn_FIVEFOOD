import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class UsersService {
  constructor(private dbService: DatabaseService) {}

  async findByEmail(email: string) {
    const result = await this.dbService.query(
      `SELECT u.*, r.RoleName 
       FROM Users u 
       INNER JOIN Roles r ON u.RoleID = r.RoleID 
       WHERE u.Email = @Email`,
      [{ name: 'Email',  value: email }],
    );
    return result.recordset[0] || null;
  }

  async findById(id: number) {
    const result = await this.dbService.query(
      `SELECT u.UserID, u.FullName, u.Email, u.Phone, u.IsLocked, u.CreatedAt, r.RoleName 
       FROM Users u 
       INNER JOIN Roles r ON u.RoleID = r.RoleID 
       WHERE u.UserID = @UserID`,
      [{ name: 'UserID',  value: id }],
    );
    return result.recordset[0] || null;
  }

  async createUser(
    fullName: string,
    email: string,
    phone: string,
    passwordHash: string,
    roleName: string = 'Client',
  ) {
    // 1. Tìm hoặc tự tạo RoleID nếu chưa có sẵn trong DB
    const roleResult = await this.dbService.query(
      `SELECT RoleID FROM Roles WHERE RoleName = @RoleName`,
      [{ name: 'RoleName',  value: roleName }],
    );

    let roleId = roleResult.recordset[0]?.RoleID;

    if (!roleId) {
      const insertRole = await this.dbService.query(
        `INSERT INTO Roles (RoleName) OUTPUT inserted.RoleID VALUES (@RoleName)`,
        [{ name: 'RoleName',  value: roleName }],
      );
      roleId = insertRole.recordset[0].RoleID;
    }

    // 2. Tạo tài khoản người dùng mới
    const result = await this.dbService.query(
      `INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleID, IsLocked) 
       OUTPUT inserted.UserID, inserted.FullName, inserted.Email, inserted.Phone
       VALUES (@FullName, @Email, @Phone, @PasswordHash, @RoleID, 0)`,
      [
        { name: 'FullName',  value: fullName },
        { name: 'Email',  value: email },
        { name: 'Phone',  value: phone },
        { name: 'PasswordHash',  value: passwordHash },
        { name: 'RoleID',  value: roleId },
      ],
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
        { name: 'UserID',  value: id },
        { name: 'FullName',  value: fullName },
        { name: 'Phone',  value: phone },
      ],
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
        { name: 'UserID',  value: id },
        { name: 'PasswordHash',  value: passwordHash },
      ],
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
       LIMIT @ OFFSET @`,
      [
        { name: 'Offset',  value: offset },
        { name: 'Limit',  value: limit },
      ],
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
        itemsPerPage: limit,
      },
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
        { name: 'UserID',  value: id },
        { name: 'IsLocked',  value: isLocked },
      ],
    );
    return result.recordset[0] || null;
  }
}
