import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed view over {@link ConfigService} for app-wide settings (DB, Vercel detection, JWT).
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get isVercel(): boolean {
    return this.config.get<boolean>('isVercel', false);
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('databaseUrl');
  }

  get jwtSecret(): string {
    return this.config.getOrThrow<string>('jwt.secret');
  }
}
