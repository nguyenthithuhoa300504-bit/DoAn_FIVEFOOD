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
}
