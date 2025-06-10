import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserDocument } from './user/schemas/user.schema';
import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtTimeUtil } from './utils/jwt-time.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: UserDocument, response: Response): Promise<void> {
    try {
      const tokenPayload = { userId: user._id.toHexString() };
      const token = this.jwtService.sign(tokenPayload);

      const jwtExpiration = this.getJwtExpirationInSeconds();
      const expires = new Date();
      expires.setSeconds(expires.getSeconds() + jwtExpiration);

      const cookieOptions = this.getCookieSecurityOptions(expires);
      response.cookie('Authentication', token, cookieOptions);
      this.logger.log(`User ${user.email} logged in successfully.`);
    } catch (error) {
      this.logger.error(`Login failed for user ${user.email}`, error.stack);
      throw new InternalServerErrorException('Login failed');
    }
  }

  private getJwtExpirationInSeconds(): number {
    const jwtExpiration = this.configService.get<string>('JWT_EXPIRATION');

    if (!jwtExpiration) {
      const error = 'JWT_EXPIRATION is required but not configured';
      this.logger.error(error);
      throw new InternalServerErrorException(error);
    }

    return JwtTimeUtil.parseJwtExpirationToSeconds(jwtExpiration);
  }

  private getCookieSecurityOptions(expires: Date): CookieOptions {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
    const isProduction = environment === 'production';

    // Configuración base según entorno con override explícito
    const options: CookieOptions = {
      expires,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: this.configService.get<boolean>(
        'JWT_SECURE_COOKIE',
        isProduction,
      ),
      //domain: this.configService.get<string>('JWT_COOKIE_DOMAIN'), // .implementos.cl
    };

    this.logger.debug('Cookie security config', {
      secure: options.secure,
      sameSite: options.sameSite,
      environment: this.configService.get('NODE_ENV'),
    });

    return options;
  }
}
