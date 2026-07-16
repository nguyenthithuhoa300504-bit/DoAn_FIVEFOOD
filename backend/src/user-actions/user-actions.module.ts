import { Module } from '@nestjs/common';
import { UserActionsController } from './user-actions.controller';
import { UserActionsService } from './user-actions.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserActionsController],
  providers: [UserActionsService],
  exports: [UserActionsService]
})
export class UserActionsModule {}
