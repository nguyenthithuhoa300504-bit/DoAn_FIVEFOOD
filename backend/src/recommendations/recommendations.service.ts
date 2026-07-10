import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getRecommendations(userId?: number) {
    try {
      let recommendedProducts: any[] = [];

      // Nếu người dùng đã đăng nhập, cố gắng lấy gợi ý cá nhân hóa
      if (userId) {
        // 1. Lấy các món ăn được gợi ý dựa trên lịch sử mua hàng của user
        // Chú ý: Lấy các món ăn cùng loại (CategoryID) với các món khách mua nhiều nhất, 
        // nhưng loại trừ các món khách đã từng mua. (Đây là một logic ví dụ)
        // Tuy nhiên, view v_RecommendedProducts chỉ trả về số lượng mua, 
        // ta có thể đơn giản hóa bằng cách: Gợi ý Top món bán chạy hoặc các món yêu thích (Favorites)
        const personalQuery = `
          SELECT TOP 10 p.ProductID, p.ProductName, p.Price, p.ImageURL, c.CategoryName
          FROM Products p
          INNER JOIN Categories c ON p.CategoryID = c.CategoryID
          WHERE p.ProductID IN (
            SELECT ProductID FROM Favorites WHERE UserID = @UserID
            UNION
            SELECT ProductID FROM v_RecommendedProducts WHERE UserID = @UserID
          )
          AND p.IsActive = 1
        `;
        const personalResult = await this.databaseService.query(personalQuery, [
          { name: 'UserID', type: sql.Int, value: userId }
        ]);
        recommendedProducts = personalResult.recordset;
      }

      // 2. Nếu chưa có gợi ý nào (người dùng mới hoặc chưa đăng nhập), lấy Top 10 bán chạy
      if (recommendedProducts.length === 0) {
        const topSellingQuery = `
          SELECT TOP 10 p.ProductID, p.ProductName, p.Price, p.ImageURL, c.CategoryName, v.TotalSold
          FROM v_SanPhamBanChay v
          INNER JOIN Products p ON v.ProductID = p.ProductID
          INNER JOIN Categories c ON p.CategoryID = c.CategoryID
          WHERE p.IsActive = 1
          ORDER BY v.TotalSold DESC
        `;
        const topSellingResult = await this.databaseService.query(topSellingQuery);
        recommendedProducts = topSellingResult.recordset;
      }

      return recommendedProducts;
    } catch (error) {
      this.logger.error('Error fetching recommendations', error);
      throw error;
    }
  }
}
