import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Cần AuthModule để sử dụng JwtAuthGuard & RolesGuard
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
