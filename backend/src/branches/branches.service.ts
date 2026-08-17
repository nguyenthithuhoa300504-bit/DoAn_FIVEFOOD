import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    try {
      const query = `
        SELECT BranchID, BranchName, Latitude, Longitude, Address, CoverageRadius, Description, IsActive, IsHeadquarters
        FROM Branches
        WHERE IsActive = 1
        ORDER BY IsHeadquarters DESC, BranchID ASC
      `;
      const result = await this.databaseService.query(query);
      return result.recordset;
    } catch (error) {
      this.logger.error('Error fetching branches:', error);
      throw error;
    }
  }

  async create(createBranchDto: any) {
    try {
      const query = `
        INSERT INTO Branches (BranchName, Latitude, Longitude, Address, CoverageRadius, Description, IsActive, IsHeadquarters)
        OUTPUT INSERTED.*
        VALUES (@0, @1, @2, @3, @4, @5, @6, @7)
      `;
      const result = await this.databaseService.query(query, [
        { name: '0', type: sql.NVarChar, value: createBranchDto.BranchName },
        { name: '1', type: sql.Decimal(9, 6), value: createBranchDto.Latitude },
        { name: '2', type: sql.Decimal(9, 6), value: createBranchDto.Longitude },
        { name: '3', type: sql.NVarChar, value: createBranchDto.Address || null },
        { name: '4', type: sql.Int, value: createBranchDto.CoverageRadius || 5 },
        { name: '5', type: sql.NVarChar, value: createBranchDto.Description || null },
        { name: '6', type: sql.Bit, value: createBranchDto.IsActive !== undefined ? createBranchDto.IsActive : 1 },
        { name: '7', type: sql.Bit, value: createBranchDto.IsHeadquarters !== undefined ? createBranchDto.IsHeadquarters : 0 }
      ]);
      return result.recordset[0];
    } catch (error) {
      this.logger.error('Error creating branch:', error);
      throw error;
    }
  }

  async update(id: number, updateBranchDto: any) {
    try {
      const query = `
        UPDATE Branches
        SET BranchName = @0, Latitude = @1, Longitude = @2, Address = @3, CoverageRadius = @4, Description = @5, IsActive = @6, IsHeadquarters = @7
        OUTPUT INSERTED.*
        WHERE BranchID = @8
      `;
      const result = await this.databaseService.query(query, [
        { name: '0', type: sql.NVarChar, value: updateBranchDto.BranchName },
        { name: '1', type: sql.Decimal(9, 6), value: updateBranchDto.Latitude },
        { name: '2', type: sql.Decimal(9, 6), value: updateBranchDto.Longitude },
        { name: '3', type: sql.NVarChar, value: updateBranchDto.Address || null },
        { name: '4', type: sql.Int, value: updateBranchDto.CoverageRadius || 5 },
        { name: '5', type: sql.NVarChar, value: updateBranchDto.Description || null },
        { name: '6', type: sql.Bit, value: updateBranchDto.IsActive !== undefined ? updateBranchDto.IsActive : 1 },
        { name: '7', type: sql.Bit, value: updateBranchDto.IsHeadquarters !== undefined ? updateBranchDto.IsHeadquarters : 0 },
        { name: '8', type: sql.Int, value: id }
      ]);
      return result.recordset[0];
    } catch (error) {
      this.logger.error(`Error updating branch ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      // Soft delete
      const query = `
        UPDATE Branches
        SET IsActive = 0
        WHERE BranchID = @0
      `;
      await this.databaseService.query(query, [
        { name: '0', type: sql.Int, value: id }
      ]);
      return { success: true, message: 'Branch deactivated' };
    } catch (error) {
      this.logger.error(`Error deleting branch ${id}:`, error);
      throw error;
    }
  }
}
