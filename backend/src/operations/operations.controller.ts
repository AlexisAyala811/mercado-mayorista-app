import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { OperationsService } from './operations.service.js';
import { OperationQueryDto } from './operation-query.dto.js';

@Controller('operations')
@ApiTags('operations')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler, UserRole.Assistant)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get(':clientOperationId')
  get(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('clientOperationId', ParseUUIDPipe) clientOperationId: string,
    @Query() query: OperationQueryDto,
  ) {
    return this.operations.get(
      identity.businessId,
      clientOperationId,
      query.type,
    );
  }
}
