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
import { AccountEntity } from './entities/account.entity.js';
import { PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { AccountsService } from './accounts.service.js';
import { RegisterPaymentDto, ReversePaymentDto } from './http/account.dto.js';

@Controller('accounts')
@ApiTags('accounts')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.accounts.list(identity.businessId, page);
  }

  @Get('cash/movements')
  cashMovements(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.accounts.listCashMovements(identity.businessId, page);
  }

  @Get(':id')
  get(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return auditForeignAccess(
      this.audit,
      identity,
      AccountEntity,
      id,
      'account',
      () => this.accounts.get(identity.businessId, id),
    );
  }

  @Post(':id/payments')
  payment(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RegisterPaymentDto,
  ) {
    return this.accounts.registerPayment(identity, id, input);
  }

  @Post(':id/payments/:paymentId/reversal')
  reverse(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() input: ReversePaymentDto,
  ) {
    return this.accounts.reversePayment(identity, id, paymentId, input);
  }
}
