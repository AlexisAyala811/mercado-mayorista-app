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
  constructor(private readonly receipts: ReceiptsService) {}

  @Get('purchases/:id.pdf')
  async purchase(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await this.receipts.purchase(identity, id);
    setPdfHeaders(response, `compra-${id}.pdf`);
    return new StreamableFile(pdf);
  }

  @Get('sales/:id.pdf')
  async sale(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await this.receipts.sale(identity, id);
    setPdfHeaders(response, `venta-${id}.pdf`);
    return new StreamableFile(pdf);
  }

  @Get('sale-returns/:id.pdf')
  async saleReturn(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await this.receipts.saleReturn(identity, id);
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
