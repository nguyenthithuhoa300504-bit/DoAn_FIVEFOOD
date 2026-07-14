import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventsGateway } from '../gateway/events.gateway';
import * as sql from 'mssql';

@Injectable()
export class OrdersService {
  constructor(
    private dbService: DatabaseService,
    private eventsGateway: EventsGateway
  ) {}

  /**
   * Tạo đơn hàng mới thông qua Stored Procedure sp_TaoHoaDon
   */
  async createOrder(
    userId: number,
    shippingAddress: string,
    latitude: number | null,
    longitude: number | null,
    paymentMethod: string,
    promoCode?: string,
    shippingFee = 0
  ) {
    try {
      const inputs = [
        { name: 'UserID', type: sql.Int, value: userId },
        { name: 'ShippingAddress', type: sql.NVarChar(255), value: shippingAddress },
        { name: 'Latitude', type: sql.Decimal(9, 6), value: latitude || null },
        { name: 'Longitude', type: sql.Decimal(9, 6), value: longitude || null },
        { name: 'PaymentMethod', type: sql.NVarChar(50), value: paymentMethod },
        { name: 'PromoCode', type: sql.VarChar(50), value: promoCode || null },
        { name: 'ShippingFee', type: sql.Decimal(18, 2), value: shippingFee }
      ];

      const result = await this.dbService.executeProcedure('sp_TaoHoaDon', inputs);
      
      // Nếu Procedure trả về kết quả
      if (result.recordset && result.recordset.length > 0) {
        return result.recordset[0];
      }
      
      throw new BadRequestException('Không thể hoàn tất tạo đơn hàng.');
    } catch (err) {
      // Bắt các thông báo lỗi THROW từ SQL Server
      throw new BadRequestException(err.message || 'Lỗi khi đặt hàng.');
    }
  }

  /**
   * Xem danh sách lịch sử đơn hàng của 1 khách hàng cụ thể
   */
  async getClientOrders(userId: number) {
    const result = await this.dbService.query(
      `SELECT o.OrderID, o.OrderDate, o.TotalAmount, o.DiscountAmount, o.ShippingFee, o.FinalAmount, 
              o.Status, o.PaymentMethod, o.PaymentStatus, o.ShippingAddress, o.CallCount, p.PromoCode
       FROM Orders o
       LEFT JOIN Promotions p ON o.PromotionID = p.PromotionID
       WHERE o.UserID = @UserID
       ORDER BY o.OrderDate DESC`,
      [{ name: 'UserID', type: sql.Int, value: userId }]
    );
    return result.recordset;
  }

  /**
   * Lấy chi tiết hóa đơn (kèm danh sách món ăn)
   */
  async getOrderDetails(userId: number, orderId: number, isAdmin = false) {
    // 1. Lấy thông tin đơn hàng tổng quát
    const orderResult = await this.dbService.query(
      `SELECT o.*, u.FullName, u.Email, u.Phone, p.PromoCode
       FROM Orders o
       INNER JOIN Users u ON o.UserID = u.UserID
       LEFT JOIN Promotions p ON o.PromotionID = p.PromotionID
       WHERE o.OrderID = @OrderID`,
      [{ name: 'OrderID', type: sql.Int, value: orderId }]
    );

    if (orderResult.recordset.length === 0) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    const order = orderResult.recordset[0];

    // Kiểm tra quyền: Chỉ cho phép chính chủ xem đơn hàng (Client) hoặc Admin xem
    if (!isAdmin && order.UserID !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập thông tin đơn hàng này.');
    }

    // 2. Lấy danh sách món ăn trong chi tiết đơn hàng
    const itemsResult = await this.dbService.query(
      `SELECT od.OrderDetailID, od.ProductID, od.Quantity, od.UnitPrice, p.ProductName, p.ImageURL
       FROM OrderDetails od
       INNER JOIN Products p ON od.ProductID = p.ProductID
       WHERE od.OrderID = @OrderID`,
      [{ name: 'OrderID', type: sql.Int, value: orderId }]
    );

    return {
      ...order,
      items: itemsResult.recordset
    };
  }

  /**
   * Lấy toàn bộ đơn hàng trong hệ thống (Cho Admin)
   */
  async getAllOrders() {
    const result = await this.dbService.query(
      `SELECT o.OrderID, o.OrderDate, o.TotalAmount, o.DiscountAmount, o.ShippingFee, o.FinalAmount, 
              o.Status, o.PaymentMethod, o.PaymentStatus, o.ShippingAddress, o.CallCount, u.FullName, u.Email
       FROM Orders o
       INNER JOIN Users u ON o.UserID = u.UserID
       LEFT JOIN Promotions p ON o.PromotionID = p.PromotionID
       ORDER BY o.OrderDate DESC`
    );
    return result.recordset;
  }

  /**
   * Cập nhật trạng thái đơn hàng (Duyệt đơn, đang giao, hoàn thành, hủy đơn)
   */
  async updateOrderStatus(orderId: number, status: string) {
    // 1. Kiểm tra đơn hàng có tồn tại không
    const orderResult = await this.dbService.query(
      `SELECT OrderID, UserID, Latitude, Longitude, PaymentMethod FROM Orders WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', type: sql.Int, value: orderId }]
    );

    if (orderResult.recordset.length === 0) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    // Tự động chuyển PaymentStatus sang Đã thanh toán nếu hoàn thành đơn COD
    let paymentStatusQuery = '';
    const params = [
      { name: 'OrderID', type: sql.Int, value: orderId },
      { name: 'Status', type: sql.NVarChar(50), value: status }
    ];

    if (status === 'Hoàn thành') {
      paymentStatusQuery = `, PaymentStatus = N'Đã thanh toán'`;
    }

    // Cập nhật trạng thái đơn hàng (Nếu status = 'Đã hủy', DB Trigger sẽ tự hoàn kho)
    await this.dbService.query(
      `UPDATE Orders 
       SET Status = @Status ${paymentStatusQuery}
       WHERE OrderID = @OrderID`,
      params
    );

    // Phát sự kiện WebSockets
    this.eventsGateway.notifyOrderStatusUpdate(orderResult.recordset[0].UserID, orderId, status);

    if (status === 'Đang giao') {
      const { UserID, Latitude, Longitude } = orderResult.recordset[0];
      if (Latitude && Longitude) {
        // Tọa độ cửa hàng cố định (Hà Nội Center)
        const storeLat = 21.0285;
        const storeLng = 105.8542;
        this.eventsGateway.startDeliverySimulation(
          orderId, 
          UserID, 
          storeLat, storeLng, 
          Latitude, Longitude
        );
      }
    }

    return { success: true, message: `Cập nhật đơn hàng sang "${status}" thành công.` };
  }

  /**
   * Mô phỏng Shipper gọi điện thoại cho khách hàng
   */
  async simulateShipperCall(orderId: number) {
    const orderResult = await this.dbService.query(
      `SELECT OrderID, UserID, Status, CallCount FROM Orders WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', type: sql.Int, value: orderId }]
    );

    if (orderResult.recordset.length === 0) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    const order = orderResult.recordset[0];
    if (order.Status !== 'Đang giao') {
      throw new BadRequestException('Chỉ có thể gọi điện khi đơn hàng ở trạng thái Đang giao.');
    }

    const newCallCount = (order.CallCount || 0) + 1;

    if (newCallCount > 3) {
      // Quá 3 lần -> Trả hàng lại bên shop
      await this.updateOrderStatus(orderId, 'Trả hàng');
      return { 
        success: true, 
        message: 'Shipper đã gọi quá 3 lần không bắt máy. Đơn hàng tự động chuyển sang "Trả hàng".',
        callCount: newCallCount
      };
    } else {
      // Cập nhật số lần gọi
      await this.dbService.query(
        `UPDATE Orders SET CallCount = @CallCount WHERE OrderID = @OrderID`,
        [
          { name: 'CallCount', type: sql.Int, value: newCallCount },
          { name: 'OrderID', type: sql.Int, value: orderId }
        ]
      );
      
      // Gửi thông báo WebSocket cho Client biết shipper đang gọi
      this.eventsGateway.server.to(`room_user_${order.UserID}`).emit('shipperCalling', { orderId, callCount: newCallCount });

      return { 
        success: true, 
        message: `Đã mô phỏng Shipper gọi điện (Lần ${newCallCount}/3).`,
        callCount: newCallCount
      };
    }
  }

  /**
   * Kiểm tra nhanh voucher khuyến mãi từ phía Client
   */
  async validatePromotion(code: string, orderTotal: number) {
    const result = await this.dbService.query(
      `SELECT PromotionID, PromoCode, DiscountPercentage, MaxDiscountAmount, MinOrderValue, UsageLimit, UsedCount, StartDate, EndDate
       FROM Promotions
       WHERE PromoCode = @Code`,
      [{ name: 'Code', type: sql.VarChar(50), value: code }]
    );

    if (result.recordset.length === 0) {
      return { valid: false, message: 'Mã giảm giá không tồn tại.' };
    }

    const promo = result.recordset[0];
    const now = new Date();

    if (now < new Date(promo.StartDate) || now > new Date(promo.EndDate)) {
      return { valid: false, message: 'Mã giảm giá đã hết hạn hoặc chưa được kích hoạt.' };
    }

    if (promo.UsedCount >= promo.UsageLimit) {
      return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng trên hệ thống.' };
    }

    if (orderTotal < promo.MinOrderValue) {
      return { 
        valid: false, 
        message: `Đơn hàng tối thiểu phải đạt ${promo.MinOrderValue.toLocaleString('vi-VN')} đ để sử dụng mã.` 
      };
    }

    // Tính toán số tiền được giảm
    let discountAmount = (orderTotal * promo.DiscountPercentage) / 100;
    if (discountAmount > promo.MaxDiscountAmount) {
      discountAmount = promo.MaxDiscountAmount;
    }

    return {
      valid: true,
      discountAmount,
      promoCode: promo.PromoCode,
      message: 'Áp dụng mã giảm giá thành công!'
    };
  }

  /**
   * Khách hàng tự hủy đơn hàng (chỉ khi trạng thái là Chờ xác nhận)
   */
  async cancelOrder(userId: number, orderId: number) {
    const orderResult = await this.dbService.query(
      `SELECT UserID, Status FROM Orders WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', type: sql.Int, value: orderId }]
    );

    if (orderResult.recordset.length === 0) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    const order = orderResult.recordset[0];

    if (order.UserID !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này.');
    }

    if (order.Status !== 'Chờ xác nhận') {
      throw new BadRequestException('Chỉ có thể hủy đơn hàng ở trạng thái "Chờ xác nhận".');
    }

    // Cập nhật trạng thái thành Đã hủy (Trigger DB sẽ tự hoàn kho)
    await this.dbService.query(
      `UPDATE Orders 
       SET Status = N'Đã hủy'
       WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', type: sql.Int, value: orderId }]
    );

    return { success: true, message: 'Hủy đơn hàng thành công.' };
  }
}
