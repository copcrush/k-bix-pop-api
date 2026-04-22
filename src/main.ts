import 'reflect-metadata';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

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
    return cb(null, true);
  }
  const ok = CORS_ORIGINS.some((rule) =>
    typeof rule === 'string' ? rule === origin : rule.test(origin),
  );
  cb(null, ok);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT) || 8888;
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
