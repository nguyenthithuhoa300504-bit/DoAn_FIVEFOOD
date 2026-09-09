import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class CartService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Lấy danh sách sản phẩm trong giỏ hàng của người dùng hiện tại
   */
  async getCart(userId: number) {
    const result = await this.dbService.query(
      `SELECT c.CartItemID, c.ProductID, c.Quantity, c.UpdatedAt, p.ProductName, p.Price, p.ImageURL, p.Inventory
       FROM CartItems c
       INNER JOIN Products p ON c.ProductID = p.ProductID
       WHERE c.UserID = @UserID
       ORDER BY c.UpdatedAt DESC`,
      [{ name: 'UserID', value: userId }],
    );
    return result.recordset;
  }

  /**
   * Thêm sản phẩm vào giỏ hàng hoặc cập nhật số lượng
   */
  async addToCart(userId: number, productId: number, quantity: number) {
    // Kiểm tra xem món ăn đã có trong giỏ hàng chưa
    const existing = await this.dbService.query(
      `SELECT CartItemID, Quantity FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID`,
      [
        { name: 'UserID', value: userId },
        { name: 'ProductID', value: productId },
      ],
    );

    if (existing.recordset.length > 0) {
      // Đã tồn tại -> Cập nhật số lượng gộp
      const newQuantity = existing.recordset[0].Quantity + quantity;
      if (newQuantity <= 0) {
        // Nếu số lượng gộp bé hơn hoặc bằng 0 -> Tiến hành xóa món ăn khỏi giỏ hàng
        await this.removeFromCart(userId, productId);
        return { message: 'Đã xóa món ăn khỏi giỏ hàng.' };
      }

      await this.dbService.query(
        `UPDATE CartItems 
         SET Quantity = @Quantity, UpdatedAt = CURRENT_TIMESTAMP 
         WHERE UserID = @UserID AND ProductID = @ProductID`,
        [
          { name: 'UserID', value: userId },
          { name: 'ProductID', value: productId },
          { name: 'Quantity', value: newQuantity },
        ],
      );
    } else {
      // Chưa tồn tại -> Kiểm tra nếu số lượng đầu vào nhỏ hơn hoặc bằng 0 thì không thêm
      if (quantity <= 0) {
        return { message: 'Số lượng thêm mới vào giỏ hàng phải lớn hơn 0.' };
      }

      // Thêm mới vào giỏ hàng
      await this.dbService.query(
        `INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) 
         VALUES (@UserID, @ProductID, @Quantity, CURRENT_TIMESTAMP)`,
        [
          { name: 'UserID', value: userId },
          { name: 'ProductID', value: productId },
          { name: 'Quantity', value: quantity },
        ],
      );
    }

    return await this.getCart(userId);
  }

  /**
   * Thiết lập số lượng chính xác cho sản phẩm trong giỏ hàng (sử dụng cho PUT /api/cart/update)
   */
  async updateCartQuantity(
    userId: number,
    productId: number,
    quantity: number,
  ) {
    if (quantity <= 0) {
      return await this.removeFromCart(userId, productId);
    }

    // Kiểm tra xem món ăn đã có trong giỏ hàng chưa
    const existing = await this.dbService.query(
      `SELECT CartItemID FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID`,
      [
        { name: 'UserID', value: userId },
        { name: 'ProductID', value: productId },
      ],
    );

    if (existing.recordset.length > 0) {
      await this.dbService.query(
        `UPDATE CartItems 
         SET Quantity = @Quantity, UpdatedAt = CURRENT_TIMESTAMP 
         WHERE UserID = @UserID AND ProductID = @ProductID`,
        [
          { name: 'UserID', value: userId },
          { name: 'ProductID', value: productId },
          { name: 'Quantity', value: quantity },
        ],
      );
    } else {
      // Nếu chưa có, thêm mới
      await this.dbService.query(
        `INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) 
         VALUES (@UserID, @ProductID, @Quantity, CURRENT_TIMESTAMP)`,
        [
          { name: 'UserID', value: userId },
          { name: 'ProductID', value: productId },
          { name: 'Quantity', value: quantity },
        ],
      );
    }

    return await this.getCart(userId);
  }

  /**
   * Xóa hẳn sản phẩm khỏi giỏ hàng
   */
  async removeFromCart(userId: number, productId: number) {
    await this.dbService.query(
      `DELETE FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID`,
      [
        { name: 'UserID', value: userId },
        { name: 'ProductID', value: productId },
      ],
    );
    return await this.getCart(userId);
  }

  /**
   * Đồng bộ hóa giỏ hàng từ localStorage lên database sau khi đăng nhập
   */
  async syncCart(
    userId: number,
    items: { productId: number; quantity: number }[],
  ) {
    for (const item of items) {
      if (item.productId && item.quantity > 0) {
        // Kiểm tra xem món ăn này đã có sẵn trong DB chưa
        const existing = await this.dbService.query(
          `SELECT CartItemID, Quantity FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID`,
          [
            { name: 'UserID', value: userId },
            { name: 'ProductID', value: item.productId },
          ],
        );

        if (existing.recordset.length > 0) {
          // Gộp số lượng
          const newQuantity = existing.recordset[0].Quantity + item.quantity;
          await this.dbService.query(
            `UPDATE CartItems 
             SET Quantity = @Quantity, UpdatedAt = CURRENT_TIMESTAMP 
             WHERE UserID = @UserID AND ProductID = @ProductID`,
            [
              { name: 'UserID', value: userId },
              { name: 'ProductID', value: item.productId },
              { name: 'Quantity', value: newQuantity },
            ],
          );
        } else {
          // Thêm mới
          await this.dbService.query(
            `INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) 
             VALUES (@UserID, @ProductID, @Quantity, CURRENT_TIMESTAMP)`,
            [
              { name: 'UserID', value: userId },
              { name: 'ProductID', value: item.productId },
              { name: 'Quantity', value: item.quantity },
            ],
          );
        }
      }
    }
    return await this.getCart(userId);
  }
}
