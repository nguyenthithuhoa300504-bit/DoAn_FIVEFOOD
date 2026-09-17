import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { VNPay, ProductCode } from 'vnpay';

import { formatInTimeZone } from 'date-fns-tz';

@Injectable()
export class PaymentService {
  private vnpayInstance: VNPay;

  constructor(
    private dbService: DatabaseService,
    private configService: ConfigService,
  ) {
    const tmnCode =
      this.configService.get<string>('VNP_TMN_CODE')?.trim() || '';
    const secureSecret =
      this.configService.get<string>('VNP_HASH_SECRET')?.trim() || '';

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
  async createPaymentUrl(
    userId: number,
    orderId: number,
    ipAddr: string,
  ): Promise<string> {
    // 1. Kiểm tra đơn hàng có tồn tại và thuộc về user không
    const orderResult = await this.dbService.query(
      `SELECT OrderID, UserID, FinalAmount, PaymentStatus, Status FROM Orders WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', value: orderId }],
    );

    if (orderResult.recordset.length === 0) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    const order = orderResult.recordset[0];
    if (order.UserID !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền thanh toán cho đơn hàng này.',
      );
    }

    if (order.PaymentStatus === 'Đã thanh toán') {
      throw new BadRequestException(
        'Đơn hàng này đã được thanh toán trước đó.',
      );
    }

    if (order.Status === 'Đã hủy') {
      throw new BadRequestException('Không thể thanh toán đơn hàng đã hủy.');
    }

    const returnUrl =
      this.configService.get<string>('VNP_RETURN_URL')?.trim() ||
      'http://localhost:5173/';

    const now = new Date();
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000); // 15 phút sau
    const vnp_CreateDate = Number(formatInTimeZone(now, 'Asia/Ho_Chi_Minh', 'yyyyMMddHHmmss'));
    const vnp_ExpireDate = Number(formatInTimeZone(expireDate, 'Asia/Ho_Chi_Minh', 'yyyyMMddHHmmss'));

    // Build URL using official vnpay library
    const finalUrl = this.vnpayInstance.buildPaymentUrl({
      vnp_Amount: Math.round(order.FinalAmount), // Library handles *100 automatically
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: orderId.toString() + '_' + Date.now(),
      vnp_OrderInfo: `Thanh_toan_don_hang_${orderId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_CreateDate: vnp_CreateDate,
      vnp_ExpireDate: vnp_ExpireDate,
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
    } catch (err) {
      return {
        success: false,
        message: 'Chữ ký giao dịch không hợp lệ.',
        orderId: queryParams['vnp_TxnRef']
          ? parseInt(queryParams['vnp_TxnRef'].split('_')[0], 10)
          : 0,
      };
    }

    const txnRef = queryParams['vnp_TxnRef'] || '';
    const orderId = parseInt(txnRef.split('_')[0], 10);
    const responseCode = queryParams['vnp_ResponseCode'];

    if (!verify.isSuccess) {
      return {
        success: false,
        message: 'Chữ ký giao dịch không hợp lệ.',
        orderId,
      };
    }

    if (responseCode === '00') {
      const transactionNo = queryParams['vnp_TransactionNo'];
      const vnpAmount = parseInt(queryParams['vnp_Amount'] || '0', 10) / 100;

      // Dành riêng cho môi trường Localhost (vì VNPay không thể gọi IPN ngầm vào localhost)
      // Cập nhật luôn trạng thái đơn hàng tại đây để hiển thị đúng trên Admin
      await this.dbService.query(
        `UPDATE Orders SET PaymentStatus = 'Đã thanh toán' WHERE OrderID = @OrderID`,
        [{ name: 'OrderID', value: orderId }],
      );

      // Chèn luôn lịch sử giao dịch (nếu chưa có)
      await this.dbService.query(
        `IF NOT EXISTS (SELECT 1 FROM Transactions WHERE OrderID = @OrderID)
         BEGIN
           INSERT INTO Transactions (OrderID, PaymentGateway, TransactionNo, Amount, Status, ResponseCode, CreatedAt)
           VALUES (@OrderID, 'VNPAY', @TransactionNo, @Amount, 'Thanh cong', @ResponseCode, CURRENT_TIMESTAMP)
         END`,
        [
          { name: 'OrderID', value: orderId },
          {
            name: 'TransactionNo',

            value: transactionNo || `VNP_${Date.now()}`,
          },
          { name: 'Amount', value: vnpAmount },
          { name: 'ResponseCode', value: responseCode },
        ],
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
        [{ name: 'OrderID', value: orderId }],
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
          {
            name: 'PaymentStatus',

            value: paymentStatus,
          },
          { name: 'OrderID', value: orderId },
        ],
      );

      await this.dbService.query(
        `INSERT INTO Transactions (OrderID, PaymentGateway, TransactionNo, Amount, Status, ResponseCode, CreatedAt)
         VALUES (@OrderID, 'VNPAY', @TransactionNo, @Amount, @Status, @ResponseCode, CURRENT_TIMESTAMP)`,
        [
          { name: 'OrderID', value: orderId },
          {
            name: 'TransactionNo',

            value: transactionNo || `VNP_${Date.now()}`,
          },
          { name: 'Amount', value: vnpAmount },
          { name: 'Status', value: transactionStatus },
          { name: 'ResponseCode', value: responseCode },
        ],
      );

      return { RspCode: '00', Message: 'Confirm success' };
    } catch (err) {
      console.error('Lỗi xử lý VNPay IPN:', err);
      return {
        RspCode: '99',
        Message: 'Input required data invalid / System error',
      };
    }
  }

  /**
   * Xác nhận thanh toán thủ công cho VietQR (chỉ dùng cho mục đích Đồ Án)
   */
  async confirmVietQrPayment(orderId: number, userId: number) {
    const orderResult = await this.dbService.query(
      `SELECT OrderID, UserID, FinalAmount, PaymentStatus FROM Orders WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', value: orderId }],
    );

    if (orderResult.recordset.length === 0) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    const order = orderResult.recordset[0];
    if (order.UserID !== userId) {
      throw new BadRequestException('Bạn không có quyền cập nhật đơn hàng này.');
    }

    await this.dbService.query(
      `UPDATE Orders SET PaymentStatus = 'Đã thanh toán' WHERE OrderID = @OrderID`,
      [{ name: 'OrderID', value: orderId }],
    );

    // Lưu transaction
    await this.dbService.query(
      `INSERT INTO Transactions (OrderID, PaymentGateway, TransactionNo, Amount, Status, ResponseCode, CreatedAt)
       SELECT @OrderID, 'VIETQR', @TransactionNo, @Amount, 'Thanh cong', '00', CURRENT_TIMESTAMP
       WHERE NOT EXISTS (SELECT 1 FROM Transactions WHERE OrderID = @OrderID)`,
      [
        { name: 'OrderID', value: orderId },
        { name: 'TransactionNo', value: `VQR_${Date.now()}` },
        { name: 'Amount', value: order.FinalAmount },
      ],
    );

    return { success: true, message: 'Đã xác nhận thanh toán VietQR thành công.' };
  }
}
