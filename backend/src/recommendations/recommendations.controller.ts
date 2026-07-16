import { Controller, Get, Req } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import * as jwt from 'jsonwebtoken';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  async getRecommendations(@Req() req: any) {
    let userId: number | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'fivefood_jwt_secret_key_2026_secure';
        const decoded: any = jwt.verify(token, secret);
        userId = decoded.sub; // The payload uses 'sub' for UserID
      }
    } catch (err) {
      // Ignored: Treat as guest if token is invalid or missing
    }
    
    const data = await this.recommendationsService.getRecommendations(userId);
    return {
      success: true,
      data: data
    };
  }
}
