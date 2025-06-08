import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  app.useGlobalPipes(
    new ValidationPipe({
      // Quiero que si pasamos una propieda que no está definida en el DTO, si falle:
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('PORT') || 3001);
}
bootstrap();
