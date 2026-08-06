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

  @Post('generate-promo')
  async generatePromo(@Body() body: { productName: string; type: string; discount?: string; event?: string }) {
    const content = await this.chatbotService.generatePromotionContent(body);
    return { success: true, data: content };
  }

  @Post('generate-desc')
  async generateDesc(@Body() body: { productName: string; ingredients: string }) {
    const content = await this.chatbotService.generateProductDescription(body.productName, body.ingredients);
    return { success: true, data: content };
  }

  @Post('announcement')
  async setAnnouncement(@Body() body: { content: string }) {
    const result = await this.chatbotService.setWebsiteAnnouncement(body.content);
    return result;
  }

  @Get('announcement')
  async getAnnouncement() {
    const content = await this.chatbotService.getWebsiteAnnouncement();
    return { success: true, data: content };
  }
}
