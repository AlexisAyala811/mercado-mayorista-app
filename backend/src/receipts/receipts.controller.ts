import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuditService } from '../audit/audit.service.js';
import { auditForeignAccess } from '../audit/foreign-access.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { SaleReturnEntity } from '../sales/entities/sale-return.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { ReceiptsService } from './receipts.service.js';

@Controller('receipts')
@ApiTags('receipts')
@ApiBearerAuth('session')
@ApiProduces('application/pdf')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler, UserRole.Assistant)
export class ReceiptsController {
  constructor(
    private readonly receipts: ReceiptsService,
    private readonly audit: AuditService,
  ) {}

  @Get('purchases/:id.pdf')
  async purchase(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await auditForeignAccess(
      this.audit,
      identity,
      PurchaseSettlementEntity,
      id,
      'purchase-settlement',
      () => this.receipts.purchase(identity, id),
    );
    setPdfHeaders(response, `compra-${id}.pdf`);
    return new StreamableFile(pdf);
  }

  @Get('sales/:id.pdf')
  async sale(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await auditForeignAccess(
      this.audit,
      identity,
      SaleEntity,
      id,
      'sale',
      () => this.receipts.sale(identity, id),
    );
    setPdfHeaders(response, `venta-${id}.pdf`);
    return new StreamableFile(pdf);
  }

  @Get('sale-returns/:id.pdf')
  async saleReturn(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await auditForeignAccess(
      this.audit,
      identity,
      SaleReturnEntity,
      id,
      'sale-return',
      () => this.receipts.saleReturn(identity, id),
    );
    setPdfHeaders(response, `devolucion-venta-${id}.pdf`);
    return new StreamableFile(pdf);
  }
}

function setPdfHeaders(response: Response, filename: string) {
  response.set({
    'Cache-Control': 'private, no-store',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Type': 'application/pdf',
  });
}
