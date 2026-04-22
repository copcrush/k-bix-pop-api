import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  ClassSerializerInterceptor,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { isVercel } from './runtime/environment';

const CORS_ORIGINS: (string | RegExp)[] = [
  'https://k-bix-pop.vercel.app',
  /^https:\/\/k-bix-pop[\w-]*\.vercel\.app$/,
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
];

function corsOrigin(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) {
  if (!origin) {
    cb(null, true);
    return;
  }
  const ok = CORS_ORIGINS.some((rule) =>
    typeof rule === 'string' ? rule === origin : rule.test(origin),
  );
  cb(null, ok);
}

async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Device',
      'X-Requested-With',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('api');

  return app;
}

async function bootstrapLocal() {
  const app = await createNestApp();
  const port = Number(process.env.PORT);
  await app.listen(Number.isFinite(port) && port > 0 ? port : 8888);
}

let vercelApp: INestApplication | undefined;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!vercelApp) {
    vercelApp = await createNestApp();
    await vercelApp.init();
  }
  vercelApp.getHttpAdapter().getInstance()(req, res);
}

if (!isVercel()) {
  bootstrapLocal().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
