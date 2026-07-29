import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtService } from '@nestjs/jwt';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly jwtService: JwtService
  ) {}

  @Post()
  async handleChat(@Body() body: { message: string; sessionId?: string }, @Req() req: any) {
    let userId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify(token);
        userId = payload.sub; // payload.sub chứa UserID
      }
    } catch (e) {
      // Bỏ qua lỗi token (ví dụ hết hạn), coi như là guest
    }
    
    const result = await this.chatbotService.processMessage(userId, body.message, body.sessionId);
    return {
      success: true,
      data: result
    };
  }

  @Get('logs')
  async getLogs() {
    const logs = await this.chatbotService.getLogs();
    return {
      success: true,
      data: logs
    };
  }
}
