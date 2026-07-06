import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Toàn bộ endpoints trong controller này đều cần đăng nhập (JWT)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  /**
   * API Lấy giỏ hàng của user hiện tại
   * GET /api/cart
   */
  @Get()
  async getCart(@Request() req) {
    const userId = req.user.userId;
    return await this.cartService.getCart(userId);
  }

  /**
   * API Thêm món ăn vào giỏ hàng (cộng dồn số lượng)
   * POST /api/cart/add
   */
  @Post('add')
  @HttpCode(HttpStatus.OK)
  async addToCart(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const { productId, quantity } = body;
    return await this.cartService.addToCart(userId, parseInt(productId, 10), parseInt(quantity, 10));
  }

  /**
   * API Cập nhật số lượng món ăn trong giỏ hàng (thiết lập giá trị tuyệt đối)
   * PUT /api/cart/update
   */
  @Put('update')
  @HttpCode(HttpStatus.OK)
  async updateCartQuantity(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const { productId, quantity } = body;
    return await this.cartService.updateCartQuantity(userId, parseInt(productId, 10), parseInt(quantity, 10));
  }

  /**
   * API Xóa hẳn sản phẩm khỏi giỏ hàng
   * DELETE /api/cart/remove/:productId
   */
  @Delete('remove/:productId')
  async removeFromCart(@Request() req, @Param('productId', ParseIntPipe) productId: number) {
    const userId = req.user.userId;
    return await this.cartService.removeFromCart(userId, productId);
  }

  /**
   * API Đồng bộ hóa giỏ hàng từ localStorage lên database khi đăng nhập thành công
   * POST /api/cart/sync
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncCart(@Request() req, @Body('items') items: any[]) {
    const userId = req.user.userId;
    const formattedItems = (items || []).map(item => ({
      productId: parseInt(item.productId, 10),
      quantity: parseInt(item.quantity, 10)
    }));
    return await this.cartService.syncCart(userId, formattedItems);
  }
}
