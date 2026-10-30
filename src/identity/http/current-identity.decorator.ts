import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './authenticated-request.js';

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().identity;
  },
);
