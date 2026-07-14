import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService], // Export ra de events.gateway dung
})
export class ChatModule {}
