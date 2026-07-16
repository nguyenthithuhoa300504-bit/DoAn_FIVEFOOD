import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { UserActionsService } from './user-actions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user-actions')
export class UserActionsController {
  constructor(private readonly userActionsService: UserActionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('log')
  async logAction(
    @Req() req: any,
    @Body() body: { actionType: string; productId?: number; searchQuery?: string }
  ) {
    const userId = req.user.userId;
    const { actionType, productId, searchQuery } = body;
    return await this.userActionsService.logAction(userId, actionType, productId, searchQuery);
  }
}
