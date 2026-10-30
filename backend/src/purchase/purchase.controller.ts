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
  constructor(private readonly purchases: PurchaseService) {}

  @Get('receptions/:receptionId/settlement')
  get(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('receptionId', ParseUUIDPipe) receptionId: string,
  ) {
    return this.purchases.getByReception(identity.businessId, receptionId);
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
