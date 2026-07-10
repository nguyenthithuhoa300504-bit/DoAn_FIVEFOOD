import { Controller, Get, Req } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  async getRecommendations(@Req() req: any) {
    // Determine userId from request (if JWT token is present and validated)
    // If auth middleware is applied globally, req.user will be populated
    const userId = req.user ? req.user.userId : null;
    
    const data = await this.recommendationsService.getRecommendations(userId);
    return {
      success: true,
      data: data
    };
  }
}
