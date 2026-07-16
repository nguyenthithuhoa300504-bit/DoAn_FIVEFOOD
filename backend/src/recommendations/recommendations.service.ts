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
        // 1. Lấy các từ khóa tìm kiếm gần đây (trong 7 ngày)
        const searchIntentQuery = `
          SELECT DISTINCT SearchQuery 
          FROM UserActionLogs 
          WHERE UserID = @UserID AND ActionType = 'SEARCH' 
            AND CreatedAt >= DATEADD(DAY, -7, GETDATE()) 
            AND SearchQuery IS NOT NULL
        `;
        const searchResult = await this.databaseService.query(searchIntentQuery, [
          { name: 'UserID', type: sql.Int, value: userId }
        ]);
        const searchQueries = searchResult.recordset.map(r => r.SearchQuery).filter(q => q && q.trim().length > 0);

        // Tạo điều kiện LIKE động cho Search Intent
        let searchScoreSql = '0';
        if (searchQueries.length > 0) {
          const likeConditions = searchQueries.map(q => `p.ProductName LIKE N'%${q.replace(/'/g, "''")}%'`).join(' OR ');
          searchScoreSql = `CASE WHEN (${likeConditions}) THEN 5 ELSE 0 END`;
        }

        // 2. Lấy gợi ý dựa trên UserActionLogs (Time decay 7 days, Weighted scoring) và v_RecommendedProducts
        const personalQuery = `
          WITH RecentLogs AS (
              SELECT ProductID, ActionType
              FROM UserActionLogs
              WHERE UserID = @UserID AND CreatedAt >= DATEADD(DAY, -7, GETDATE()) AND ProductID IS NOT NULL
          ),
          ActionScores AS (
              SELECT ProductID,
                     SUM(CASE ActionType
                         WHEN 'VIEW_PRODUCT' THEN 1
                         WHEN 'ADD_TO_CART' THEN 2
                         WHEN 'FAVORITE_PRODUCT' THEN 3
                         ELSE 0 END) AS Score
              FROM RecentLogs
              GROUP BY ProductID
          ),
          PurchaseScores AS (
              SELECT ProductID, TotalQuantityOrdered * 2 AS Score -- Trọng số cho món đã từng mua
              FROM v_RecommendedProducts
              WHERE UserID = @UserID
          ),
          CombinedScores AS (
              SELECT ProductID, SUM(Score) AS BaseScore
              FROM (
                  SELECT ProductID, Score FROM ActionScores
                  UNION ALL
                  SELECT ProductID, Score FROM PurchaseScores
              ) t
              GROUP BY ProductID
          )
          SELECT TOP 10 
              p.ProductID, p.ProductName, p.Price, p.ImageURL, c.CategoryName, 
              (ISNULL(cs.BaseScore, 0) + ${searchScoreSql}) AS TotalScore
          FROM Products p
          LEFT JOIN CombinedScores cs ON p.ProductID = cs.ProductID
          INNER JOIN Categories c ON p.CategoryID = c.CategoryID
          WHERE p.IsActive = 1 AND (ISNULL(cs.BaseScore, 0) + ${searchScoreSql}) > 0
          ORDER BY TotalScore DESC
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

      // 3. Fallback: Nếu hệ thống chưa có đủ dữ liệu đơn hàng, lấy ngẫu nhiên 10 món
      if (recommendedProducts.length === 0) {
        const randomQuery = `
          SELECT TOP 10 p.ProductID, p.ProductName, p.Price, p.ImageURL, c.CategoryName
          FROM Products p
          INNER JOIN Categories c ON p.CategoryID = c.CategoryID
          WHERE p.IsActive = 1
          ORDER BY NEWID()
        `;
        const randomResult = await this.databaseService.query(randomQuery);
        recommendedProducts = randomResult.recordset;
      }

      return recommendedProducts;
    } catch (error) {
      this.logger.error('Error fetching recommendations', error);
      require('fs').writeFileSync('recs_error.log', (error ? error.stack : 'Unknown error') + '');
      throw error;
    }
  }
}
