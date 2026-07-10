import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async handleChat(@Body() body: { message: string; sessionId?: string }, @Req() req: any) {
    // For a real app, you might extract userId from JWT token in req.user
    // Here we'll just check if req.user exists, otherwise use null for guests
    const userId = req.user ? req.user.userId : null;
    
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
