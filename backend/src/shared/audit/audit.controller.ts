import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { SessionIdentity } from '../../modules/identity/application/ports/session-identity-reader.js';
import { UserRole } from '../../modules/identity/entities/user.entity.js';
import { CurrentIdentity } from '../../modules/identity/http/current-identity.decorator.js';
import { Roles } from '../../modules/identity/http/roles.decorator.js';
import { RolesGuard } from '../../modules/identity/http/roles.guard.js';
import { SessionAuthGuard } from '../../modules/identity/http/session-auth.guard.js';
import { AuditQueryDto } from './audit-query.dto.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
@ApiTags('audit')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('events')
  @Header('Cache-Control', 'private, no-store')
  events(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: AuditQueryDto,
  ) {
    return this.audit.list(identity.businessId, query);
  }
}
