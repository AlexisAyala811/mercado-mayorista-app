import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuditService } from '../../audit/audit.service.js';
import { auditForeignAccess } from '../../audit/foreign-access.js';
import { BuyerEntity } from '../../catalog/entities/buyer.entity.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../../identity/entities/user.entity.js';
import { CurrentIdentity } from '../../identity/http/current-identity.decorator.js';
import { Roles } from '../../identity/http/roles.decorator.js';
import { RolesGuard } from '../../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../../identity/http/session-auth.guard.js';
import { BuyerStatementService } from './buyer-statement.service.js';

// Spec 009: only the Wholesaler generates and sends a buyer's statement.
@Controller('receipts/buyer-statements')
@ApiTags('receipts')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class BuyerStatementController {
  constructor(
    private readonly statements: BuyerStatementService,
    private readonly audit: AuditService,
  ) {}

  // File routes go first so ":buyerId" does not swallow the extension.
  @Get(':buyerId.pdf')
  @ApiProduces('application/pdf')
  async pdf(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { content, statement } = await this.guarded(identity, buyerId, () =>
      this.statements.pdf(identity, buyerId),
    );
    sendFile(response, `${statement.statementNumber}.pdf`, 'application/pdf');
    return new StreamableFile(content);
  }

  @Get(':buyerId.png')
  @ApiProduces('image/png')
  async png(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { content, statement } = await this.guarded(identity, buyerId, () =>
      this.statements.png(identity, buyerId),
    );
    sendFile(response, `${statement.statementNumber}.png`, 'image/png');
    return new StreamableFile(content);
  }

  @Get(':buyerId')
  @Header('Cache-Control', 'private, no-store')
  summary(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
  ) {
    return this.guarded(identity, buyerId, async () => {
      const { sourceVersion: _, ...statement } =
        await this.statements.statement(identity, buyerId);
      return statement;
    });
  }

  private guarded<T>(
    identity: SessionIdentity,
    buyerId: string,
    work: () => Promise<T>,
  ) {
    return auditForeignAccess(
      this.audit,
      identity,
      BuyerEntity,
      buyerId,
      'buyer',
      work,
    );
  }
}

function sendFile(response: Response, filename: string, contentType: string) {
  response.set({
    'Cache-Control': 'private, no-store',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Type': contentType,
  });
}
