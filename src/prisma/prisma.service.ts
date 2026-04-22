import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppConfigService } from '../config/app-config.service';
import { isVercel } from '../runtime/environment';

/** Registered once via global `PrismaModule` so Nest does not construct multiple pools. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
