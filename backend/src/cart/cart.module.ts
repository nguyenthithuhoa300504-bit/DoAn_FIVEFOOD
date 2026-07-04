import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Để sử dụng JwtAuthGuard bảo mật API
  providers: [CartService],
  controllers: [CartController],
})
export class CartModule {}
