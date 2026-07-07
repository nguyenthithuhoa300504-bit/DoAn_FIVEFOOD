import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';
import { VNPay, ProductCode } from 'vnpay';

@Injectable()
export class PaymentService {
  private vnpayInstance: VNPay;

  constructor(
    private dbService: DatabaseService,
    private configService: ConfigService,
  ) {
    const tmnCode = this.configService.get<string>('VNP_TMN_CODE')?.trim() || '';
    const secureSecret = this.configService.get<string>('VNP_HASH_SECRET')?.trim() || '';
    
    this.vnpayInstance = new VNPay({
      tmnCode: tmnCode,
      secureSecret: secureSecret,
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      enableLog: true,
    });
  }

  /**
   * Sinh URL thanh toán VNPay cho đơn hàng
   */
  async createPaymentUrl(userId: number, orderId: number, ipAddr: string): Promise<string> {
    // 1. Kiểm tra đơn hàng có tồn tại và thuộc về user không
    const orderResult = await this.dbService.query(
      `SELECT OrderID, UserID, FinalAmount, PaymentStatus, Status FROM Orders WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', type: sql.Int, value: orderId }]
    );

    if (orderResult.recordset.length === 0) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    const order = orderResult.recordset[0];
    if (order.UserID !== userId) {
      throw new BadRequestException('Bạn không có quyền thanh toán cho đơn hàng này.');
    }

    if (order.PaymentStatus === 'Đã thanh toán') {
      throw new BadRequestException('Đơn hàng này đã được thanh toán trước đó.');
    }

    if (order.Status === 'Đã hủy') {
      throw new BadRequestException('Không thể thanh toán đơn hàng đã hủy.');
    }

    const returnUrl = this.configService.get<string>('VNP_RETURN_URL')?.trim() || 'http://localhost:5173/';
    
    const date = new Date();
    const yyyy = date.getFullYear().toString();
    const MM = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const HH = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    const createDate = Number(yyyy + MM + dd + HH + mm + ss);

    // Build URL using official vnpay library
    const finalUrl = this.vnpayInstance.buildPaymentUrl({
        vnp_Amount: Math.round(order.FinalAmount), // Library handles *100 automatically
        vnp_IpAddr: ipAddr || '127.0.0.1',
        vnp_ReturnUrl: returnUrl,
        vnp_TxnRef: orderId.toString() + '_' + Date.now(), 
        vnp_OrderInfo: `Thanh_toan_don_hang_${orderId}`,
        vnp_OrderType: ProductCode.Other,
        vnp_CreateDate: createDate, // Explicitly pass to prevent timezone issues
    });

    return finalUrl;
  }

  /**
   * Xử lý kết quả trả về cho Frontend (Verify chữ ký & check đơn)
   */
  async processReturn(queryParams: any) {
    let verify;
    try {
        verify = this.vnpayInstance.verifyReturnUrl(queryParams);
    } catch(err) {
        return { success: false, message: 'Chữ ký giao dịch không hợp lệ.', orderId: queryParams['vnp_TxnRef'] ? parseInt(queryParams['vnp_TxnRef'].split('_')[0], 10) : 0 };
    }
    
    const txnRef = queryParams['vnp_TxnRef'] || '';
    const orderId = parseInt(txnRef.split('_')[0], 10);
    const responseCode = queryParams['vnp_ResponseCode'];

    if (!verify.isSuccess) {
      return { success: false, message: 'Chữ ký giao dịch không hợp lệ.', orderId };
    }

    if (responseCode === '00') {
      const transactionNo = queryParams['vnp_TransactionNo'];
      const vnpAmount = parseInt(queryParams['vnp_Amount'] || '0', 10) / 100;

      // Dành riêng cho môi trường Localhost (vì VNPay không thể gọi IPN ngầm vào localhost)
      // Cập nhật luôn trạng thái đơn hàng tại đây để hiển thị đúng trên Admin
      await this.dbService.query(
        `UPDATE Orders SET PaymentStatus = N'Đã thanh toán' WHERE OrderID = @OrderID`,
        [{ name: 'OrderID', type: sql.Int, value: orderId }]
      );
      
      // Chèn luôn lịch sử giao dịch (nếu chưa có)
      await this.dbService.query(
        `IF NOT EXISTS (SELECT 1 FROM Transactions WHERE OrderID = @OrderID)
         BEGIN
           INSERT INTO Transactions (OrderID, PaymentGateway, TransactionNo, Amount, Status, ResponseCode, CreatedAt)
           VALUES (@OrderID, 'VNPAY', @TransactionNo, @Amount, 'Thanh cong', @ResponseCode, GETDATE())
         END`,
        [
          { name: 'OrderID', type: sql.Int, value: orderId },
          { name: 'TransactionNo', type: sql.VarChar(100), value: transactionNo || `VNP_${Date.now()}` },
          { name: 'Amount', type: sql.Decimal(18, 2), value: vnpAmount },
          { name: 'ResponseCode', type: sql.VarChar(10), value: responseCode },
        ]
      );

      return {
        success: true,
        orderId,
        message: 'Thanh toán thành công qua VNPay.',
      };
    } else {
      return {
        success: false,
        orderId,
        message: `Thanh toán thất bại hoặc bị hủy.`,
      };
    }
  }

  /**
   * Xử lý IPN (gọi ngầm từ server VNPay) để đồng bộ trạng thái an toàn
   */
  async processIpn(queryParams: any) {
    try {
      let verify;
      try {
          verify = this.vnpayInstance.verifyIpnCall(queryParams);
      } catch (err) {
          return { RspCode: '97', Message: 'Invalid signature' };
      }
      
      if (!verify.isSuccess) {
        return { RspCode: '97', Message: 'Invalid signature' };
      }

      const txnRef = queryParams['vnp_TxnRef'] || '';
      const orderId = parseInt(txnRef.split('_')[0], 10);
      const responseCode = queryParams['vnp_ResponseCode'];
      // Tham số vnp_Amount trả về từ VNPay luôn được nhân 100, do đó cần chia lại 100
      const vnpAmount = parseInt(queryParams['vnp_Amount'], 10) / 100;
      const transactionNo = queryParams['vnp_TransactionNo'];

      // 2. Kiểm tra đơn hàng có tồn tại không
      const orderResult = await this.dbService.query(
        `SELECT OrderID, FinalAmount, PaymentStatus FROM Orders WHERE OrderID = @OrderID`,
        [{ name: 'OrderID', type: sql.Int, value: orderId }]
      );

      if (orderResult.recordset.length === 0) {
        return { RspCode: '01', Message: 'Order not found' };
      }

      const order = orderResult.recordset[0];

      // 3. Kiểm tra số tiền có khớp không
      if (Math.round(order.FinalAmount) !== Math.round(vnpAmount)) {
        return { RspCode: '04', Message: 'Amount mismatch' };
      }

      // 4. Kiểm tra xem đơn hàng đã cập nhật trạng thái thanh toán chưa
      if (order.PaymentStatus === 'Đã thanh toán') {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      // 5. Cập nhật trạng thái thanh toán & chèn lịch sử giao dịch vào Transactions
      const isSuccess = responseCode === '00';
      const paymentStatus = isSuccess ? 'Đã thanh toán' : 'Thất bại';
      const transactionStatus = isSuccess ? 'Thanh cong' : 'That bai';

      await this.dbService.query(
        `UPDATE Orders SET PaymentStatus = @PaymentStatus WHERE OrderID = @OrderID`,
        [
          { name: 'PaymentStatus', type: sql.NVarChar(50), value: paymentStatus },
          { name: 'OrderID', type: sql.Int, value: orderId },
        ]
      );

      await this.dbService.query(
        `INSERT INTO Transactions (OrderID, PaymentGateway, TransactionNo, Amount, Status, ResponseCode, CreatedAt)
         VALUES (@OrderID, 'VNPAY', @TransactionNo, @Amount, @Status, @ResponseCode, GETDATE())`,
        [
          { name: 'OrderID', type: sql.Int, value: orderId },
          { name: 'TransactionNo', type: sql.VarChar(100), value: transactionNo || `VNP_${Date.now()}` },
          { name: 'Amount', type: sql.Decimal(18, 2), value: vnpAmount },
          { name: 'Status', type: sql.NVarChar(50), value: transactionStatus },
          { name: 'ResponseCode', type: sql.VarChar(10), value: responseCode },
        ]
      );

      return { RspCode: '00', Message: 'Confirm success' };
    } catch (err) {
      console.error('Lỗi xử lý VNPay IPN:', err);
      return { RspCode: '99', Message: 'Input required data invalid / System error' };
    }
  }
}
