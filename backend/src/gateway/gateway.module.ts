import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    DatabaseModule,
    ChatModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway]
})
export class GatewayModule {}
