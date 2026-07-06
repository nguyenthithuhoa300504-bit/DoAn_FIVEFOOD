import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request, 
  ParseIntPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  /**
   * Tạo đơn hàng mới
   * POST /api/orders
   */
  @Post()
  async createOrder(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const { shippingAddress, latitude, longitude, paymentMethod, promoCode, shippingFee } = body;
    return await this.ordersService.createOrder(
      userId,
      shippingAddress,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      paymentMethod,
      promoCode,
      shippingFee ? parseFloat(shippingFee) : 0
    );
  }

  /**
   * Khách hàng lấy danh sách đơn hàng đã mua
   * GET /api/orders
   */
  @Get()
  async getClientOrders(@Request() req) {
    const userId = req.user.userId;
    return await this.ordersService.getClientOrders(userId);
  }

  /**
   * Kiểm tra nhanh voucher khuyến mãi
   * POST /api/orders/validate-promo
   */
  @Post('validate-promo')
  @HttpCode(HttpStatus.OK)
  async validatePromotion(@Body() body: any) {
    const { code, totalAmount } = body;
    return await this.ordersService.validatePromotion(code, parseFloat(totalAmount));
  }

  /**
   * Khách hàng xem chi tiết đơn hàng
   * GET /api/orders/:id
   */
  @Get(':id')
  async getOrderDetails(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return await this.ordersService.getOrderDetails(userId, id, false);
  }

  /**
   * Khách hàng tự hủy đơn hàng
   * PUT /api/orders/:id/cancel
   */
  @Put(':id/cancel')
  async cancelOrder(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return await this.ordersService.cancelOrder(userId, id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private ordersService: OrdersService) {}

  /**
   * Admin lấy toàn bộ đơn hàng trong hệ thống
   * GET /api/admin/orders
   */
  @Get()
  @Roles('Admin')
  async getAllOrders() {
    return await this.ordersService.getAllOrders();
  }

  /**
   * Admin xem chi tiết bất kỳ hóa đơn nào
   * GET /api/admin/orders/:id
   */
  @Get(':id')
  @Roles('Admin')
  async getAdminOrderDetails(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return await this.ordersService.getOrderDetails(userId, id, true);
  }

  /**
   * Admin cập nhật trạng thái đơn hàng (duyệt, giao hàng, hoàn thành, hủy đơn)
   * PUT /api/admin/orders/:id/status
   */
  @Put(':id/status')
  @Roles('Admin')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return await this.ordersService.updateOrderStatus(id, status);
  }
}
