import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PageQueryDto } from '../../common/http/page-query.dto.js';
import { DelegationService } from '../application/delegation.service.js';
import { IdentityAdministrationService } from '../application/identity-administration.service.js';
import type { SessionIdentity } from '../application/ports/session-identity-reader.js';
import { UserRole } from '../entities/user.entity.js';
import { CurrentIdentity } from './current-identity.decorator.js';
import {
  CreateAssistantDto,
  CreateDelegationDto,
  ResetAssistantPasswordDto,
} from './identity-administration.dto.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('identity')
@ApiTags('identity-administration')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class IdentityAdministrationController {
  constructor(
    private readonly administration: IdentityAdministrationService,
    private readonly delegations: DelegationService,
  ) {}

  @Get('assistants')
  assistants(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.administration.listAssistants(identity.businessId, page);
  }

  @Post('assistants')
  createAssistant(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateAssistantDto,
  ) {
    return this.administration.createAssistant(identity, input);
  }

  @Patch('assistants/:id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ResetAssistantPasswordDto,
  ) {
    return this.administration.resetAssistantPassword(identity, id, input);
  }

  @Delete('assistants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateAssistant(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.administration.deactivateAssistant(identity, id);
  }

  @Get('delegations')
  listDelegations(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.delegations.list(identity.businessId, page);
  }

  @Post('assistants/:id/delegations')
  createDelegation(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateDelegationDto,
  ) {
    return this.delegations.create(identity, id, input);
  }

  @Delete('delegations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeDelegation(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.delegations.revoke(identity, id);
  }
}
