import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getReviewsByProduct(productId: number) {
    try {
      // Lấy danh sách bình luận
      const queryReviews = `
        SELECT r.ReviewID, r.Rating, r.Comment, r.CreatedAt, u.FullName 
        FROM Reviews r
        INNER JOIN Users u ON r.UserID = u.UserID
        WHERE r.ProductID = @ProductID AND r.IsHidden = 0
        ORDER BY r.CreatedAt DESC
      `;
      const reviewsResult = await this.databaseService.query(queryReviews, [
        { name: 'ProductID',  value: productId },
      ]);

      // Lấy thống kê số sao trung bình
      const queryStats = `
        SELECT 
          COALESCE(AVG(CAST(Rating AS FLOAT)), 0) AS AvgRating, 
          COUNT(*) AS TotalReviews 
        FROM Reviews 
        WHERE ProductID = @ProductID AND IsHidden = 0
      `;
      const statsResult = await this.databaseService.query(queryStats, [
        { name: 'ProductID',  value: productId },
      ]);

      return {
        reviews: reviewsResult.recordset,
        stats: statsResult.recordset[0],
      };
    } catch (error) {
      this.logger.error('Error fetching reviews', error);
      throw error;
    }
  }

  async addReview(
    userId: number,
    productId: number,
    orderId: number,
    rating: number,
    comment: string,
  ) {
    try {
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Điểm đánh giá phải từ 1 đến 5 sao.');
      }

      // 1. Kiểm tra điều kiện: Đơn hàng phải của user này, chứa sản phẩm này và đã Hoàn thành
      const checkEligibilityQuery = `
        SELECT 1 
        FROM Orders o
        INNER JOIN OrderDetails od ON o.OrderID = od.OrderID
        WHERE o.OrderID = @OrderID 
          AND o.UserID = @UserID 
          AND od.ProductID = @ProductID 
          AND o.Status = N'Hoàn thành'
      `;
      const checkEligibility = await this.databaseService.query(
        checkEligibilityQuery,
        [
          { name: 'OrderID',  value: orderId },
          { name: 'UserID',  value: userId },
          { name: 'ProductID',  value: productId },
        ],
      );

      if (checkEligibility.recordset.length === 0) {
        throw new BadRequestException(
          'Bạn không đủ điều kiện đánh giá sản phẩm này. Đơn hàng chưa hoàn thành hoặc sản phẩm không nằm trong đơn hàng.',
        );
      }

      // 2. Kiểm tra xem user đã đánh giá cho sản phẩm này trong đơn hàng này chưa
      const checkDuplicateQuery = `
        SELECT 1 FROM Reviews 
        WHERE OrderID = @OrderID AND ProductID = @ProductID
      `;
      const checkDuplicate = await this.databaseService.query(
        checkDuplicateQuery,
        [
          { name: 'OrderID',  value: orderId },
          { name: 'ProductID',  value: productId },
        ],
      );

      if (checkDuplicate.recordset.length > 0) {
        throw new ConflictException(
          'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi.',
        );
      }

      // 3. Insert review
      const insertQuery = `
        INSERT INTO Reviews (UserID, ProductID, OrderID, Rating, Comment)
        VALUES (@UserID, @ProductID, @OrderID, @Rating, @Comment)
      `;
      await this.databaseService.query(insertQuery, [
        { name: 'UserID',  value: userId },
        { name: 'ProductID',  value: productId },
        { name: 'OrderID',  value: orderId },
        { name: 'Rating',  value: rating },
        { name: 'Comment',  value: comment || '' },
      ]);

      return { success: true, message: 'Cảm ơn bạn đã gửi đánh giá!' };
    } catch (error) {
      this.logger.error('Error adding review', error);
      throw error;
    }
  }

  async getAllReviewsForAdmin() {
    try {
      const query = `
        SELECT r.ReviewID, r.Rating, r.Comment, r.CreatedAt, r.IsHidden, 
               u.FullName, p.ProductName
        FROM Reviews r
        INNER JOIN Users u ON r.UserID = u.UserID
        INNER JOIN Products p ON r.ProductID = p.ProductID
        ORDER BY r.CreatedAt DESC
      `;
      const result = await this.databaseService.query(query);
      return result.recordset;
    } catch (error) {
      this.logger.error('Error fetching all reviews for admin', error);
      throw error;
    }
  }

  async toggleReviewVisibility(reviewId: number) {
    try {
      const checkQuery = `SELECT IsHidden FROM Reviews WHERE ReviewID = @ReviewID`;
      const checkResult = await this.databaseService.query(checkQuery, [
        { name: 'ReviewID',  value: reviewId },
      ]);

      if (checkResult.recordset.length === 0) {
        throw new BadRequestException('Đánh giá không tồn tại');
      }

      const currentStatus = checkResult.recordset[0].IsHidden;
      const newStatus = currentStatus ? 0 : 1;

      const updateQuery = `
        UPDATE Reviews 
        SET IsHidden = @NewStatus 
        WHERE ReviewID = @ReviewID
      `;
      await this.databaseService.query(updateQuery, [
        { name: 'NewStatus',  value: newStatus },
        { name: 'ReviewID',  value: reviewId },
      ]);

      return {
        success: true,
        isHidden: newStatus === 1,
        message: newStatus ? 'Đã ẩn đánh giá' : 'Đã hiển thị đánh giá',
      };
    } catch (error) {
      this.logger.error('Error toggling review visibility', error);
      throw error;
    }
  }
}
