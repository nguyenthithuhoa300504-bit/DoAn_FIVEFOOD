import { Controller, Get, Put, Body, Param, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin') // Chỉ có tài khoản Admin mới gọi được các API trong controller này
@Controller('admin/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * API Lấy danh sách người dùng phân trang (Admin)
   */
  @Get()
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.usersService.getUsers(pageNum, limitNum);
  }

  /**
   * API Khóa / Mở khóa tài khoản (Admin)
   */
  @Put(':id/lock')
  async toggleLock(
    @Param('id', ParseIntPipe) id: number,
    @Body('isLocked') isLocked: boolean,
  ) {
    const updatedUser = await this.usersService.toggleLock(id, isLocked);
    if (!updatedUser) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}.`);
    }
    return {
      message: `${isLocked ? 'Khóa' : 'Mở khóa'} tài khoản thành công.`,
      user: updatedUser,
    };
  }
}
