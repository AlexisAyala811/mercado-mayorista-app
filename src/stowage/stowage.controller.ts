import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import {
  CreateStowageEntryDto,
  CreateWorkGroupDto,
  SettleStowageDto,
} from './http/stowage.dto.js';
import { StowageService } from './stowage.service.js';

@Controller('stowage')
@ApiTags('stowage')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler)
export class StowageController {
  constructor(private readonly stowage: StowageService) {}

  @Get('groups')
  groups(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.stowage.listGroups(identity.businessId, page);
  }

  @Post('groups')
  createGroup(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateWorkGroupDto,
  ) {
    return this.stowage.createGroup(identity, input);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateGroup(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stowage.deactivateGroup(identity, id);
  }

  @Get('entries')
  entries(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.stowage.listEntries(identity.businessId, page);
  }

  @Post('entries')
  createEntry(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateStowageEntryDto,
  ) {
    return this.stowage.createEntry(identity, input);
  }

  @Post('settlements')
  settle(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: SettleStowageDto,
  ) {
    return this.stowage.settle(identity, input);
  }
}
