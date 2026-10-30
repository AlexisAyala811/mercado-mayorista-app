import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { FreightService } from './freight.service.js';
import { SettleFreightDto } from './http/freight.dto.js';

@Controller('freight')
@ApiTags('freight')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class FreightController {
  constructor(private readonly freight: FreightService) {}

  @Get('entries')
  entries(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.freight.listEntries(identity.businessId, page);
  }

  @Get('settlements')
  settlements(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.freight.listSettlements(identity.businessId, page);
  }

  @Post('settlements')
  settle(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: SettleFreightDto,
  ) {
    return this.freight.settle(identity, input);
  }
}
