import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
}
