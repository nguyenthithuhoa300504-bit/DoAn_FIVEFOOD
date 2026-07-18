import { Controller, Get, Post, Param, Body, UseGuards, Request, ParseIntPipe, Patch } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  async getReviewsByProduct(@Param('productId', ParseIntPipe) productId: number) {
    // API public, không cần đăng nhập vẫn xem được đánh giá
    return await this.reviewsService.getReviewsByProduct(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async addReview(
    @Request() req: any,
    @Body('productId', ParseIntPipe) productId: number,
    @Body('orderId', ParseIntPipe) orderId: number,
    @Body('rating', ParseIntPipe) rating: number,
    @Body('comment') comment: string,
  ) {
    const userId = req.user.userId;
    return await this.reviewsService.addReview(userId, productId, orderId, rating, comment);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  async getAllReviewsForAdmin(@Request() req: any) {
    if (req.user.role !== 'Admin') {
      throw new Error('Unauthorized');
    }
    return await this.reviewsService.getAllReviewsForAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle-hide')
  async toggleReviewVisibility(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role !== 'Admin') {
      throw new Error('Unauthorized');
    }
    return await this.reviewsService.toggleReviewVisibility(id);
  }
}
