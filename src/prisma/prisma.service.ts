import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppConfigService } from '../config/app-config.service';
import { isVercel } from '../runtime/environment';

/**
 * One Nest DI-scoped client per process (one per serverless invocation on Vercel).
 * Limits pg pool size on Vercel to reduce "too many connections" when many concurrent lambdas run.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(private readonly appConfig: AppConfigService) {
    const connectionString = appConfig.databaseUrl;
    const onVercel = isVercel();

    const pool = new Pool({
      connectionString,
      max: onVercel ? 1 : 10,
      idleTimeoutMillis: onVercel ? 5_000 : 30_000,
      connectionTimeoutMillis: onVercel ? 15_000 : 10_000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => undefined);
    await this.pool.end().catch(() => undefined);
  }
}
