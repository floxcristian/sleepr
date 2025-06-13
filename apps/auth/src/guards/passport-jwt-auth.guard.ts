import { AuthGuard } from '@nestjs/passport';

export class PassportJwtAuthGuard extends AuthGuard('jwt') {}
