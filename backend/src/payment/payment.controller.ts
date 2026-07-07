import { Controller, Get, Post, Body, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Tạo URL thanh toán VNPay cho đơn hàng
   * POST /api/payment/create-vnpay-url
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-vnpay-url')
  async createPaymentUrl(
    @Req() req: any,
    @Body('orderId') orderId: number,
  ) {
    if (!orderId) {
      throw new BadRequestException('Mã hóa đơn (orderId) là bắt buộc.');
    }

    // Lấy địa chỉ IP của Client
    let ipAddr = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress || 
                 req.ip || 
                 '127.0.0.1';
                 
    if (Array.isArray(ipAddr)) {
      ipAddr = ipAddr[0];
    }
    
    // Nếu có nhiều IP do qua proxy, lấy IP đầu tiên
    if (ipAddr && ipAddr.includes(',')) {
      ipAddr = ipAddr.split(',')[0].trim();
    }

    // Nếu IP ở dạng IPv6 (ví dụ ::1 hoặc ::ffff:127.0.0.1), chuyển đổi về IPv4 để tránh lỗi cổng thanh toán
    if (ipAddr && (ipAddr.includes(':') || ipAddr === '::1')) {
      ipAddr = '127.0.0.1';
    }

    const userId = req.user.userId;
    const paymentUrl = await this.paymentService.createPaymentUrl(userId, orderId, ipAddr);
    
    return { paymentUrl };
  }

  /**
   * Nhận phản hồi redirect từ VNPay (Frontend sẽ gọi API này để xác thực chữ ký và kiểm tra đơn)
   * GET /api/payment/vnpay-return
   */
  @Get('vnpay-return')
  async processReturn(@Query() query: any) {
    return await this.paymentService.processReturn(query);
  }

  /**
   * Cổng thanh toán VNPay gọi ngầm API này (IPN) để đồng bộ trạng thái đơn hàng tự động
   * GET /api/payment/vnpay-ipn
   */
  @Get('vnpay-ipn')
  async processIpn(@Query() query: any) {
    return await this.paymentService.processIpn(query);
  }
}
