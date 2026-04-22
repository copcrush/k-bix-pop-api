import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppConfigService } from '../config/app-config.service';
import { isVercel } from '../runtime/environment';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
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

  async onModuleDestroy() {
    await this.$disconnect().catch(() => undefined);
    await this.pool.end().catch(() => undefined);
  }
}
