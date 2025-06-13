import { AuthGuard } from '@nestjs/passport';

export class PassportLocalAuthGuard extends AuthGuard('local') {}
