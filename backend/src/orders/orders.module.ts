import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrdersService } from './orders.service';
import { OrdersController, AdminOrdersController } from './orders.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
