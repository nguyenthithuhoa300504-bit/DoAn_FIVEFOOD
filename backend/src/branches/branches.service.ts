import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    try {
      const query = `
        SELECT BranchID, BranchName, Latitude, Longitude, Address, CoverageRadius, Description, IsActive, IsHeadquarters
        FROM Branches
        WHERE IsActive = true
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
        VALUES (@0, @1, @2, @3, @4, @5, @6, @7)
        RETURNING *
      `;
      const result = await this.databaseService.query(query, [
        { name: '0', value: createBranchDto.BranchName },
        { name: '1', value: createBranchDto.Latitude },
        {
          name: '2',

          value: createBranchDto.Longitude,
        },
        {
          name: '3',

          value: createBranchDto.Address || null,
        },
        {
          name: '4',

          value: createBranchDto.CoverageRadius || 5,
        },
        {
          name: '5',

          value: createBranchDto.Description || null,
        },
        {
          name: '6',

          value:
            createBranchDto.IsActive !== undefined
              ? createBranchDto.IsActive
              : true,
        },
        {
          name: '7',

          value:
            createBranchDto.IsHeadquarters !== undefined
              ? createBranchDto.IsHeadquarters
              : false,
        },
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
        WHERE BranchID = @8
        RETURNING *
      `;
      const result = await this.databaseService.query(query, [
        { name: '0', value: updateBranchDto.BranchName },
        { name: '1', value: updateBranchDto.Latitude },
        {
          name: '2',

          value: updateBranchDto.Longitude,
        },
        {
          name: '3',

          value: updateBranchDto.Address || null,
        },
        {
          name: '4',

          value: updateBranchDto.CoverageRadius || 5,
        },
        {
          name: '5',

          value: updateBranchDto.Description || null,
        },
        {
          name: '6',

          value:
            updateBranchDto.IsActive !== undefined
              ? updateBranchDto.IsActive
              : true,
        },
        {
          name: '7',

          value:
            updateBranchDto.IsHeadquarters !== undefined
              ? updateBranchDto.IsHeadquarters
              : false,
        },
        { name: '8', value: id },
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
        SET IsActive = false
        WHERE BranchID = @0
      `;
      await this.databaseService.query(query, [{ name: '0', value: id }]);
      return { success: true, message: 'Branch deactivated' };
    } catch (error) {
      this.logger.error(`Error deleting branch ${id}:`, error);
      throw error;
    }
  }
}
