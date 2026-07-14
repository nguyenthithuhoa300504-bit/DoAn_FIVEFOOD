import { Controller, Get, Put, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Lấy lịch sử chat với 1 user cụ thể
  @Get('history/:targetUserId')
  async getHistory(@Request() req: any, @Param('targetUserId', ParseIntPipe) targetUserId: number) {
    const currentUserId = req.user.userId;
    return await this.chatService.getChatHistory(currentUserId, targetUserId);
  }

  // Admin lấy danh sách user đã chat
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @Get('users')
  async getChatUsers(@Request() req: any) {
    const adminId = req.user.userId;
    return await this.chatService.getChatUsers(adminId);
  }

  // Lấy danh sách thông báo của user
  @Get('notifications')
  async getNotifications(@Request() req: any) {
    const userId = req.user.userId;
    return await this.chatService.getNotifications(userId);
  }

  // Đánh dấu thông báo đã đọc
  @Put('notifications/:id/read')
  async markNotificationAsRead(@Request() req: any, @Param('id', ParseIntPipe) notifId: number) {
    const userId = req.user.userId;
    return await this.chatService.markAsRead(notifId, userId);
  }
}
