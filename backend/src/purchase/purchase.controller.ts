import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { PaymentStatusQueryDto } from './http/payment-status-query.dto.js';
import {
  PurchaseHistoryFilterDto,
  PurchaseHistoryQueryDto,
} from './http/purchase-history-query.dto.js';
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

  // Spec 011 (RQ-ST05): «Ver compras» list and its counts and totals.
  @Get('history')
  history(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: PurchaseHistoryQueryDto,
  ) {
    return this.purchases.history(identity.businessId, query);
  }

  @Get('history/summary')
  historySummary(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: PurchaseHistoryFilterDto,
  ) {
    return this.purchases.historySummary(identity.businessId, query);
  }

  // Spec 011 (CL-MD05): paid, debt or voided for one page of «Ver compras».
  @Get('payment-status')
  paymentStatus(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: PaymentStatusQueryDto,
  ) {
    return this.purchases.paymentStatus(identity.businessId, query.receptionIds);
  }

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

  @Get('receptions/:receptionId/settlement-groups')
  groups(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('receptionId', ParseUUIDPipe) receptionId: string,
  ) {
    return auditForeignAccess(
      this.audit,
      identity,
      ReceptionEntity,
      receptionId,
      'reception',
      () => this.purchases.settlementGroups(identity.businessId, receptionId),
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
