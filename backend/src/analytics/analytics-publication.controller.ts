import { PageQueryDto } from '../common/http/page-query.dto.js';
import { Body,Controller,Get,Param,ParseUUIDPipe,Post,Query,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { AnalyticsPublicationService } from './analytics-publication.service.js';
import { CreatePredictionPublicationDto,CreatePublicationOutcomeDto,EvaluationListQueryDto } from './analytics-query.dto.js';
@Controller('analytics')
@ApiTags('analytics')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard,RolesGuard)
@Roles(UserRole.Wholesaler)
export class AnalyticsPublicationController {
  constructor(private readonly publications:AnalyticsPublicationService){}
  @Get('publications')
  list(@CurrentIdentity() identity:SessionIdentity,@Query() page:EvaluationListQueryDto){return this.publications.list(identity,page);}
  @Get('evaluations/:id/publication-preview')
  preview(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string){return this.publications.preview(identity,id);}
  @Post('publications')
  publish(@CurrentIdentity() identity:SessionIdentity,@Body() input:CreatePredictionPublicationDto){return this.publications.publish(identity,input);}
  @Get('publications/:id')
  get(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string){return this.publications.get(identity,id);}
  @Post('publications/:id/outcomes')
  saveOutcome(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string,@Body() input:CreatePublicationOutcomeDto){return this.publications.saveOutcome(identity,id,input.clientOperationId);}
  @Get('publications/:id/outcomes')
  listOutcomes(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string,@Query() page:PageQueryDto){return this.publications.listOutcomes(identity,id,page);}
  @Get('publications/:id/outcomes/:outcomeId')
  getOutcome(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string,@Param('outcomeId',ParseUUIDPipe) outcomeId:string){return this.publications.getOutcome(identity,id,outcomeId);}
  @Get('publications/:id/outcome')
  outcome(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string){return this.publications.outcome(identity,id);}
}
