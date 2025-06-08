import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../user/schemas/user.schema';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    getCurrentUserByContext(context),
);

const getCurrentUserByContext = (context: ExecutionContext): UserDocument => {
  const request = context.switchToHttp().getRequest();
  return request.user;
};
