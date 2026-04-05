import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/auth/strategies/jwt-auth.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginData = await this.authService.login(loginDto);

    // Set refresh token as a secure HttpOnly cookie
    response.cookie('refresh_token', loginData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure flag in PROD over HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching JWT expiration
    });

    return {
      message: loginData.message,
      user: loginData.user,
      accessToken: loginData.accessToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Extract token from cookie (requires cookie-parser)
    const currentRefreshToken = request.cookies['refresh_token'];
    
    // In order to refresh, we must be somewhat authenticated to know the user id,
    // Or we decode the refresh token. Since it's a JWT, we can decode it, or require JWT Guard.
    // For simplicity and to avoid circular logic, we parse the token.
    if (!currentRefreshToken) {
      response.clearCookie('refresh_token');
      // Using standard 401 response if no cookie
      return response.status(401).json({ message: 'Refresh token not found' });
    }

    try {
      // Decode the payload out of the unverified token to get the ID
      // (The actual secret validation happens via the `authService` indirectly or we decode it manually,
      // but let's decode to extract the userId)
      const base64Url = currentRefreshToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const userId = payload.sub;

      const tokens = await this.authService.refreshTokens(userId, currentRefreshToken);

      response.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return { accessToken: tokens.accessToken };
    } catch (e) {
      response.clearCookie('refresh_token');
      return response.status(401).json({ message: 'Invalid refresh token' });
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @GetUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.userId);
    response.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }
}
