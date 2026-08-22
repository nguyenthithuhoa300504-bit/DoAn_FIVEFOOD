import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class PromotionsService {
  constructor(private readonly dbService: DatabaseService) {}

  async getAllPromotions() {
    const result = await this.dbService.query(
      `SELECT PromotionID, PromoCode, Description, DiscountPercentage, MaxDiscountAmount, MinOrderValue, UsageLimit, UsedCount, StartDate, EndDate
       FROM Promotions
       ORDER BY PromotionID DESC`,
    );
    return result.recordset;
  }

  async createPromotion(data: any) {
    const {
      PromoCode,
      Description,
      DiscountPercentage,
      MaxDiscountAmount,
      MinOrderValue,
      UsageLimit,
      StartDate,
      EndDate,
    } = data;

    // Kiem tra PromoCode ton tai chua
    const checkResult = await this.dbService.query(
      `SELECT PromotionID FROM Promotions WHERE PromoCode = @PromoCode`,
      [{ name: 'PromoCode', type: sql.VarChar(50), value: PromoCode }],
    );
    if (checkResult.recordset.length > 0) {
      throw new BadRequestException('Mã giảm giá này đã tồn tại.');
    }

    const query = `
      INSERT INTO Promotions (PromoCode, Description, DiscountPercentage, MaxDiscountAmount, MinOrderValue, UsageLimit, UsedCount, StartDate, EndDate)
      VALUES (@PromoCode, @Description, @DiscountPercentage, @MaxDiscountAmount, @MinOrderValue, @UsageLimit, 0, @StartDate, @EndDate);
      SELECT SCOPE_IDENTITY() AS PromotionID;
    `;
    const result = await this.dbService.query(query, [
      { name: 'PromoCode', type: sql.VarChar(50), value: PromoCode },
      { name: 'Description', type: sql.NVarChar(255), value: Description },
      {
        name: 'DiscountPercentage',
        type: sql.Decimal(5, 2),
        value: DiscountPercentage,
      },
      {
        name: 'MaxDiscountAmount',
        type: sql.Decimal(18, 2),
        value: MaxDiscountAmount || null,
      },
      {
        name: 'MinOrderValue',
        type: sql.Decimal(18, 2),
        value: MinOrderValue || 0,
      },
      { name: 'UsageLimit', type: sql.Int, value: UsageLimit || null },
      { name: 'StartDate', type: sql.DateTime, value: new Date(StartDate) },
      { name: 'EndDate', type: sql.DateTime, value: new Date(EndDate) },
    ]);

    return {
      success: true,
      message: 'Tạo mã giảm giá thành công',
      promotionId: result.recordset[0].PromotionID,
    };
  }

  async updatePromotion(id: number, data: any) {
    const {
      PromoCode,
      Description,
      DiscountPercentage,
      MaxDiscountAmount,
      MinOrderValue,
      UsageLimit,
      StartDate,
      EndDate,
    } = data;

    // Check duplicate code
    const checkResult = await this.dbService.query(
      `SELECT PromotionID FROM Promotions WHERE PromoCode = @PromoCode AND PromotionID != @PromotionID`,
      [
        { name: 'PromoCode', type: sql.VarChar(50), value: PromoCode },
        { name: 'PromotionID', type: sql.Int, value: id },
      ],
    );
    if (checkResult.recordset.length > 0) {
      throw new BadRequestException(
        'Mã giảm giá này đã tồn tại ở một chương trình khác.',
      );
    }

    const query = `
      UPDATE Promotions
      SET PromoCode = @PromoCode,
          Description = @Description,
          DiscountPercentage = @DiscountPercentage,
          MaxDiscountAmount = @MaxDiscountAmount,
          MinOrderValue = @MinOrderValue,
          UsageLimit = @UsageLimit,
          StartDate = @StartDate,
          EndDate = @EndDate
      WHERE PromotionID = @PromotionID
    `;
    await this.dbService.query(query, [
      { name: 'PromoCode', type: sql.VarChar(50), value: PromoCode },
      { name: 'Description', type: sql.NVarChar(255), value: Description },
      {
        name: 'DiscountPercentage',
        type: sql.Decimal(5, 2),
        value: DiscountPercentage,
      },
      {
        name: 'MaxDiscountAmount',
        type: sql.Decimal(18, 2),
        value: MaxDiscountAmount || null,
      },
      {
        name: 'MinOrderValue',
        type: sql.Decimal(18, 2),
        value: MinOrderValue || 0,
      },
      { name: 'UsageLimit', type: sql.Int, value: UsageLimit || null },
      { name: 'StartDate', type: sql.DateTime, value: new Date(StartDate) },
      { name: 'EndDate', type: sql.DateTime, value: new Date(EndDate) },
      { name: 'PromotionID', type: sql.Int, value: id },
    ]);

    return { success: true, message: 'Cập nhật mã giảm giá thành công' };
  }

  async deletePromotion(id: number) {
    // Check if promotion is used in orders
    const checkOrder = await this.dbService.query(
      `SELECT TOP 1 OrderID FROM Orders WHERE PromotionID = @PromotionID`,
      [{ name: 'PromotionID', type: sql.Int, value: id }],
    );

    if (checkOrder.recordset.length > 0) {
      throw new BadRequestException(
        'Không thể xóa mã giảm giá này vì đã có đơn hàng sử dụng.',
      );
    }

    await this.dbService.query(
      `DELETE FROM Promotions WHERE PromotionID = @PromotionID`,
      [{ name: 'PromotionID', type: sql.Int, value: id }],
    );
    return { success: true, message: 'Xóa mã giảm giá thành công' };
  }
}
