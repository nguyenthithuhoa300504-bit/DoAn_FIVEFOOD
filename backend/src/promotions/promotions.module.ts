import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { AdminPromotionsController } from './promotions.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
