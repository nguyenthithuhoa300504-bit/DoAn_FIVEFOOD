import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getFavorites(userId: number) {
    try {
      const query = `
        SELECT f.FavoriteID, p.ProductID, p.ProductName, p.Price, p.ImageURL, c.CategoryName
        FROM Favorites f
        INNER JOIN Products p ON f.ProductID = p.ProductID
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE f.UserID = @UserID
        ORDER BY f.CreatedAt DESC
      `;
      const result = await this.databaseService.query(query, [
        { name: 'UserID', type: sql.Int, value: userId },
      ]);
      return result.recordset;
    } catch (error) {
      this.logger.error('Error fetching favorites', error);
      throw error;
    }
  }

  async addFavorite(userId: number, productId: number) {
    try {
      // Kiem tra xem san pham da co trong danh sach yeu thich chua
      const checkQuery = `SELECT 1 FROM Favorites WHERE UserID = @UserID AND ProductID = @ProductID`;
      const checkResult = await this.databaseService.query(checkQuery, [
        { name: 'UserID', type: sql.Int, value: userId },
        { name: 'ProductID', type: sql.Int, value: productId },
      ]);

      if (checkResult.recordset.length > 0) {
        throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích');
      }

      const query = `
        INSERT INTO Favorites (UserID, ProductID) 
        VALUES (@UserID, @ProductID)
      `;
      await this.databaseService.query(query, [
        { name: 'UserID', type: sql.Int, value: userId },
        { name: 'ProductID', type: sql.Int, value: productId },
      ]);

      return { success: true, message: 'Đã thêm vào danh sách yêu thích' };
    } catch (error) {
      this.logger.error('Error adding favorite', error);
      throw error;
    }
  }

  async removeFavorite(userId: number, productId: number) {
    try {
      const query = `
        DELETE FROM Favorites 
        WHERE UserID = @UserID AND ProductID = @ProductID
      `;
      const result = await this.databaseService.query(query, [
        { name: 'UserID', type: sql.Int, value: userId },
        { name: 'ProductID', type: sql.Int, value: productId },
      ]);

      if (result.rowsAffected[0] === 0) {
        throw new NotFoundException('Sản phẩm không nằm trong danh sách yêu thích');
      }

      return { success: true, message: 'Đã xóa khỏi danh sách yêu thích' };
    } catch (error) {
      this.logger.error('Error removing favorite', error);
      throw error;
    }
  }
}
