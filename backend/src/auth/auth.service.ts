import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Đăng ký tài khoản khách hàng mới
   */
  async register(fullName: string, email: string, phone: string, password: string) {
    // 1. Kiểm tra xem Email đã tồn tại chưa
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng bởi một tài khoản khác.');
    }

    // 2. Băm mật khẩu bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Tạo user mới trong DB (mặc định vai trò là 'Client')
    const newUser = await this.usersService.createUser(fullName, email, phone, passwordHash, 'Client');
    return {
      message: 'Đăng ký tài khoản thành công.',
      user: newUser,
    };
  }

  /**
   * Đăng nhập tài khoản người dùng
   */
  async login(email: string, password: string) {
    // 1. Tìm người dùng theo email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 2. Kiểm tra trạng thái khóa tài khoản
    if (user.IsLocked) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.');
    }

    // 3. Kiểm tra tính đúng đắn của mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 4. Ký tạo mã JWT Token
    const payload = { sub: user.UserID, email: user.Email, role: user.RoleName };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Đăng nhập thành công.',
      accessToken,
      user: {
        userId: user.UserID,
        fullName: user.FullName,
        email: user.Email,
        role: user.RoleName,
      },
    };
  }

  /**
   * Thay đổi mật khẩu người dùng
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại.');
    }

    // Đọc thông tin user hoàn chỉnh từ DB (để lấy PasswordHash)
    const userFull = await this.usersService.findByEmail(user.Email);

    const isPasswordValid = await bcrypt.compare(oldPassword, userFull.PasswordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không chính xác.');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await this.usersService.updatePassword(userId, newPasswordHash);
    return {
      message: 'Đổi mật khẩu thành công.'
    };
  }
}
