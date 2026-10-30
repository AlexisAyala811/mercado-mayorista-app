import {
  Controller,
  Get,
  GoneException,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import {
  PriceHistoryQueryDto,
  ReportAlertsQueryDto,
  ReportAsOfDto,
  ReportPeriodDto,
  OperationOverviewQueryDto,
  ReportExportQueryDto,
  ReportRowsQueryDto,
} from './http/report-query.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@ApiTags('reports')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('rows')
  async rows(@CurrentIdentity() identity: SessionIdentity, @Query() query: ReportRowsQueryDto,
    @Res({ passthrough: true }) response: Response) {
    response.set({ 'Cache-Control': 'private, no-store' });
    return this.reports.reportRows(identity.businessId, query);
  }

  @Get('export')
  async exportReport(@CurrentIdentity() identity: SessionIdentity, @Query() query: ReportExportQueryDto,
    @Res({ passthrough: true }) response: Response) {
    const file = await this.reports.exportReport(identity.businessId, identity.businessName, query);
    response.set({ 'Cache-Control': 'private, no-store', 'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"` });
    return new StreamableFile(file.buffer);
  }

  @Get('operation-overview')
  operationOverview(@CurrentIdentity() identity: SessionIdentity, @Query() query: OperationOverviewQueryDto) {
    return this.reports.operationOverview(identity.businessId, query);
  }

  @Get('commercial-summary')
  summary(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() period: ReportPeriodDto,
  ) {
    return this.reports.commercialSummary(identity.businessId, period);
  }

  @Get('commercial-margin')
  margin() {
    throw new GoneException(
      'El margen por lote ya no forma parte de los reportes vigentes.',
    );
  }

  @Get('overdue-accounts')
  overdue(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: ReportAsOfDto,
  ) {
    return this.reports.overdueAccounts(identity.businessId, query);
  }

  @Get('alerts')
  alerts(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: ReportAlertsQueryDto,
  ) {
    return this.reports.alerts(identity.businessId, query);
  }

  @Get('price-history')
  priceHistory(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: PriceHistoryQueryDto,
  ) {
    return this.reports.priceHistory(identity.businessId, query);
  }
}
