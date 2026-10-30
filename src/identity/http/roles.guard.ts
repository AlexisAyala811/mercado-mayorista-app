import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuditService } from '../../audit/audit.service.js';
import type { UserRole } from '../entities/user.entity.js';
import type { AuthenticatedRequest } from './authenticated-request.js';
import { rolesMetadataKey } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(
      rolesMetadataKey,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = request.identity;
    if (!identity || !roles.includes(identity.role)) {
      if (identity) {
        await this.audit
          .recordDirect({
            action: 'authorization.denied',
            actorUserId: identity.userId,
            businessId: identity.businessId,
            details: {
              allowedRoles: roles,
              method: request.method,
              path: request.route?.path ?? request.path,
              role: identity.role,
            },
            resourceId: null,
            resourceType: 'http-request',
          })
          .catch(() => undefined);
      }
      throw new ForbiddenException('Acción no permitida.');
    }
    return true;
  }
}
