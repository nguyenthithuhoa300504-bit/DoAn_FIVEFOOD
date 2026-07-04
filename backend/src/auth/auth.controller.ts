import { Controller, Post, Get, Put, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  /**
   * API Đăng ký tài khoản mới (Public)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    const { fullName, email, phone, password } = body;
    return await this.authService.register(fullName, email, phone, password);
  }

  /**
   * API Đăng nhập tài khoản (Public)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const { email, password } = body;
    return await this.authService.login(email, password);
  }

  /**
   * API Lấy thông tin cá nhân (Yêu cầu JWT Token)
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    // req.user được sinh ra tự động bởi validate() của JwtStrategy
    return {
      message: 'Lấy thông tin cá nhân thành công.',
      user: req.user,
    };
  }

  /**
   * API Cập nhật thông tin cá nhân (Yêu cầu JWT Token)
   */
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const { fullName, phone } = body;
    const updated = await this.usersService.updateProfile(userId, fullName, phone);
    return {
      message: 'Cập nhật thông tin cá nhân thành công.',
      user: updated,
    };
  }

  /**
   * API Đổi mật khẩu (Yêu cầu JWT Token)
   */
  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = body;
    return await this.authService.changePassword(userId, oldPassword, newPassword);
  }
}
