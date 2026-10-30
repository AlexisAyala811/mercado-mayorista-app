import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import {
  AnalyticsReadinessQueryDto,
  AnalyticsSeriesQueryDto,
} from './analytics-query.dto.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
@ApiTags('analytics')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('filters/providers')
  providers(@CurrentIdentity() identity: SessionIdentity, @Query() page: PageQueryDto) {
    return this.analytics.filterOptions(identity.businessId, 'providers', page);
  }
  @Get('filters/buyers')
  buyers(@CurrentIdentity() identity: SessionIdentity, @Query() page: PageQueryDto) {
    return this.analytics.filterOptions(identity.businessId, 'buyers', page);
  }
  @Get('filters/varieties')
  varieties(@CurrentIdentity() identity: SessionIdentity, @Query() page: PageQueryDto) {
    return this.analytics.filterOptions(identity.businessId, 'varieties', page);
  }
  @Get('filters/qualities')
  qualities(@CurrentIdentity() identity: SessionIdentity, @Query() page: PageQueryDto) {
    return this.analytics.characteristicOptions(identity.businessId, 'quality', page);
  }
  @Get('filters/origins')
  origins(@CurrentIdentity() identity: SessionIdentity, @Query() page: PageQueryDto) {
    return this.analytics.characteristicOptions(identity.businessId, 'origin', page);
  }
  @Get('readiness')
  readiness(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: AnalyticsReadinessQueryDto,
  ) {
    return this.analytics.readiness(identity.businessId, query);
  }
  @Get('series')
  series(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() query: AnalyticsSeriesQueryDto,
  ) {
    return this.analytics.series(identity.businessId, query);
  }
}
