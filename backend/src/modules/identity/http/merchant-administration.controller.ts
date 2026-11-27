import {
  Body,
  Controller,
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

import { MerchantAdministrationService } from '../application/merchant-administration.service.js';
import type { SessionIdentity } from '../application/ports/session-identity-reader.js';
import { UserRole } from '../entities/user.entity.js';
import { CurrentIdentity } from './current-identity.decorator.js';
import {
  CreateMerchantDto,
  MerchantActionDto,
  MerchantQueryDto,
  ResetMerchantPasswordDto,
} from './merchant-administration.dto.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { SessionAuthGuard } from './session-auth.guard.js';

// Spec 023: only the Administrator. The Administrator in turn gets 403 on
// every business route, because those controllers name their roles.
@Controller('admin/merchants')
@ApiTags('admin-merchants')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class MerchantAdministrationController {
  constructor(private readonly merchants: MerchantAdministrationService) {}

  @Get()
  list(@Query() query: MerchantQueryDto) {
    return this.merchants.list(query);
  }

  @Post()
  create(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateMerchantDto,
  ) {
    return this.merchants.create(identity, input);
  }

  @Get(':id/status')
  status(@Param('id', ParseUUIDPipe) id: string) {
    return this.merchants.status(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: MerchantActionDto,
  ) {
    return this.merchants.suspend(identity, id, input);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: MerchantActionDto,
  ) {
    return this.merchants.reactivate(identity, id, input);
  }

  @Post(':id/password-reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ResetMerchantPasswordDto,
  ) {
    return this.merchants.resetPassword(identity, id, input);
  }

  @Post(':id/sessions/revoke')
  @HttpCode(HttpStatus.OK)
  revokeSessions(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: MerchantActionDto,
  ) {
    return this.merchants.revokeSessions(identity, id, input);
  }
}
