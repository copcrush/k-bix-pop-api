import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: true, // Allow all origins (good for development)
    credentials: true, // Allow cookies/auth headers
  });
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT || 8888);
}
bootstrap();
