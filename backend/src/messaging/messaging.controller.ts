import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { ReportAlertsQueryDto } from '../reports/http/report-query.dto.js';
import { ShareAttemptDto } from './messaging.dto.js';
import { MessagingService } from './messaging.service.js';

@Controller('messaging')
@ApiTags('messaging')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}
  @Get('recipients') recipients(@CurrentIdentity() identity: SessionIdentity) { return this.messaging.recipients(identity.businessId); }
  @Get('alerts') alerts(@CurrentIdentity() identity: SessionIdentity, @Query() query: ReportAlertsQueryDto) { return this.messaging.alerts(identity.businessId, query); }
  @Get('share-attempts') history(@CurrentIdentity() identity: SessionIdentity) { return this.messaging.history(identity.businessId); }
  @Post('share-attempts') record(@CurrentIdentity() identity: SessionIdentity, @Body() input: ShareAttemptDto) { return this.messaging.record(identity, input); }
}
