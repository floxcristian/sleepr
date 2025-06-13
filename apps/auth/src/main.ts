import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as CookieParser from 'cookie-parser';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  const configService = app.get(ConfigService);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_PORT'),
    },
  });
  app.use(CookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      // Quiero que si pasamos una propieda que no está definida en el DTO, si falle:
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useLogger(app.get(Logger));

  await app.startAllMicroservices();
  // Necesitamos el app.listen? porque el payment no maneja HTTP, pero el auth sí?
  await app.listen(configService.get<number>('HTTP_PORT')!);
}
bootstrap();
