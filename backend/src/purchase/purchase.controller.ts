import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service.js';
import { auditForeignAccess } from '../audit/foreign-access.js';
import { ReceptionEntity } from '../reception/entities/reception.entity.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import {
  SettlePurchaseDto,
  VoidPurchaseDto,
} from './http/settle-purchase.dto.js';
import { PurchaseService } from './purchase.service.js';

@Controller('purchases')
@ApiTags('purchases')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler, UserRole.Assistant)
export class PurchaseController {
  constructor(
    private readonly purchases: PurchaseService,
    private readonly audit: AuditService,
  ) {}

  @Get('receptions/:receptionId/settlement')
  get(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('receptionId', ParseUUIDPipe) receptionId: string,
  ) {
    return auditForeignAccess(
      this.audit,
      identity,
      ReceptionEntity,
      receptionId,
      'reception',
      () => this.purchases.getByReception(identity.businessId, receptionId),
    );
  }

  @Post('receptions/:receptionId/settlement')
  settle(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('receptionId', ParseUUIDPipe) receptionId: string,
    @Body() input: SettlePurchaseDto,
  ) {
    return this.purchases.settle(identity, receptionId, input);
  }

  @Post(':id/void')
  @Roles(UserRole.Wholesaler)
  void(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: VoidPurchaseDto,
  ) {
    return this.purchases.void(identity, id, input);
  }
}
