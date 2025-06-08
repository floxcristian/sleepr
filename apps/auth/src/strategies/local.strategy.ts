import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UserService } from '../user/user.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      usernameField: 'email',
    });
  }
  // Aquí puedes implementar la lógica de la estrategia local
  // Por ejemplo, podrías usar Passport.js para autenticar usuarios con nombre de usuario y contraseña
  async validate(email: string, password: string) {
    try {
      return await this.userService.verifyUser(email, password);
    } catch (e) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
