import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { AnalyticsEvaluationService } from './analytics-evaluation.service.js';
import { CreateAnalyticsEvaluationDto, EvaluationListQueryDto } from './analytics-query.dto.js';

@Controller('analytics/evaluations')
@ApiTags('analytics')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class AnalyticsEvaluationController {
  constructor(private readonly evaluations: AnalyticsEvaluationService) {}
  @Get()
  list(@CurrentIdentity() identity: SessionIdentity, @Query() query: EvaluationListQueryDto) { return this.evaluations.list(identity,query); }
  @Post()
  create(@CurrentIdentity() identity: SessionIdentity, @Body() input: CreateAnalyticsEvaluationDto) {
    return this.evaluations.create(identity, input);
  }
  @Get(':id')
  get(@CurrentIdentity() identity: SessionIdentity, @Param('id', ParseUUIDPipe) id: string) {
    return this.evaluations.get(identity,id);
  }
}
