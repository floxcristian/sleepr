import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';
import { Request } from 'express';
import { TokenPayload } from '../models/token-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Puedes ser `Request` o `RPC` (microservicios)
        (req: Request | any) =>
          req?.cookies?.Authentication || req?.Authentication,
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate({ userId }: TokenPayload) {
    const user = await this.userService.getUser({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

/*jwtFromRequest: (req) => {
                const token = req.cookies['jwt'];
                return token || null; // Devuelve el token JWT desde las cookies
            },
            ignoreExpiration: false, // No ignorar la expiración del token
            secretOrKey: process.env.JWT_SECRET, // Clave secreta para verificar el token*/
