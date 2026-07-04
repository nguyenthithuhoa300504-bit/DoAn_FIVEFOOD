import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService], // Export để AuthModule có thể import và sử dụng
})
export class UsersModule {}
