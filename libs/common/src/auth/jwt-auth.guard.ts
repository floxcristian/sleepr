import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AUTH_SERVICE } from '../constants/service';
import { ClientProxy } from '@nestjs/microservices';
import { map, Observable, tap } from 'rxjs';
import { UserDto } from '../dto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}
  // This guard would typically extend a base guard that checks for JWT tokens
  // and validates them against the user service.
  // For example, it could use Passport's JWT strategy.
  // The implementation details would depend on the specific JWT strategy used.
  // This is a placeholder to indicate where the JWT authentication logic would go.

  canActivate(context: ExecutionContext): boolean | Observable<boolean> {
    const jwt = context.switchToHttp().getRequest().cookies?.Authentication;
    if (!jwt) {
      return false;
    }
    // Llama al microservicio de autenticación para validar el JWT usando el message pattern 'authenticate'
    return this.authClient
      .send<UserDto>('authenticate', { Authentication: jwt })
      .pipe(
        // Utilizamos este side effect para poner el user en el request.
        tap((res) => (context.switchToHttp().getRequest().user = res)),
        // Si obtenemos una respuesta válida, significa que la autenticación fue exitosa.
        map(() => true),
      );
  }
}
