import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  /**
   * Register a new user
   * Handles password hashing and uniqueness validation
   */
  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user exists (avoid throwing Prisma unique constraint errors, handle gracefully)
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    try {
      // Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
        },
      });

      // Avoid returning the password block
      const { password: _, refreshToken: __, ...safeUser } = user;

      return {
        message: 'User registered successfully',
        user: safeUser,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  /**
   * Log in an existing user
   * Verifies password, signs access & refresh tokens
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Retrieve user securely
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    // Compare hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Save hashed refresh token to database
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { password: _, refreshToken: __, ...safeUser } = user;

    return {
      message: 'Login successful',
      user: safeUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Refreshes the access token using the HttpOnly refresh token cookie
   * Rejects if token is not valid or doesn't match the DB
   */
  async refreshTokens(userId: string, refreshToken: string) {
    // Prevent N+1 issues by picking exactly what we need directly using primary key
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, refreshToken: true }
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    // Compare refresh token from cookie with DB
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access denied');
    }

    // Issue new tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Revoke tokens on logout
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Creates a one-hour reset token for the account (if it exists).
   * Response is always generic; in non-production, `devResetToken` is included for local testing.
   */
  async forgotPassword(email: string) {
    const generic = {
      message:
        'If an account exists for this email, password reset instructions have been sent.',
    };

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return generic;

    const token = randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires },
    });

    if (process.env.NODE_ENV !== 'production') {
      return { ...generic, devResetToken: token };
    }
    return generic;
  }

  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshToken: null,
      },
    });

    return { message: 'Password has been reset. You can sign in now.' };
  }

  // --- Helpers ---

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m', // Access token expires quickly
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d', // Refresh token lives much longer
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
