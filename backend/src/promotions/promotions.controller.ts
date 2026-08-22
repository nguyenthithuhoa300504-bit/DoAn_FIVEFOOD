import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Employee') // Allowing admin and employees to manage promotions
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  async getAllPromotions() {
    return await this.promotionsService.getAllPromotions();
  }

  @Post()
  async createPromotion(@Body() body: any) {
    return await this.promotionsService.createPromotion(body);
  }

  @Put(':id')
  async updatePromotion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.promotionsService.updatePromotion(id, body);
  }

  @Delete(':id')
  async deletePromotion(@Param('id', ParseIntPipe) id: number) {
    return await this.promotionsService.deletePromotion(id);
  }
}
