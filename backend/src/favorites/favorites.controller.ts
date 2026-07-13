import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseIntPipe, Body } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(@Request() req: any) {
    const userId = req.user.userId;
    return await this.favoritesService.getFavorites(userId);
  }

  @Post()
  async addFavorite(@Request() req: any, @Body('productId', ParseIntPipe) productId: number) {
    const userId = req.user.userId;
    return await this.favoritesService.addFavorite(userId, productId);
  }

  @Delete(':productId')
  async removeFavorite(@Request() req: any, @Param('productId', ParseIntPipe) productId: number) {
    const userId = req.user.userId;
    return await this.favoritesService.removeFavorite(userId, productId);
  }
}
