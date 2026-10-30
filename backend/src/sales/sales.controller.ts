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

import { SalesHistoryQueryDto } from './http/sales-history-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import {
  CreateCommercialReturnDto,
  CreateSaleDto,
  VoidSaleDto,
} from './http/sale.dto.js';
import { SaleReturnsService } from './sale-returns.service.js';
import { SalesService } from './sales.service.js';

@Controller('sales')
@ApiTags('sales')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler, UserRole.Assistant)
export class SalesController {
  constructor(
    private readonly sales: SalesService,
    private readonly saleReturns: SaleReturnsService,
  ) {}

  @Get()
  list(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: SalesHistoryQueryDto,
  ) {
    return this.sales.list(identity.businessId, page);
  }

  @Get(':id')
  get(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sales.get(identity.businessId, id);
  }

  @Post()
  create(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateSaleDto,
  ) {
    return this.sales.create(identity, input);
  }

  @Post(':id/void')
  @Roles(UserRole.Wholesaler)
  void(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: VoidSaleDto,
  ) {
    return this.sales.void(identity, id, input);
  }

  @Post(':id/commercial-returns')
  @Roles(UserRole.Wholesaler)
  commercialReturn(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateCommercialReturnDto,
  ) {
    return this.saleReturns.create(identity, id, input);
  }
}
