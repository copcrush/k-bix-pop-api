import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to retrieve the authenticated user payload from the request object.
 * Requires the JwtAuthGuard to be active on the route.
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
