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

import { PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { CatalogService } from './catalog.service.js';
import {
  CreateBuyerDto,
  CreateProviderDto,
  CreateVarietyDto,
  UpdateBuyerDto,
  UpdateProviderDto,
  UpdateVarietyDto,
} from './http/catalog.dto.js';

@Controller('catalog')
@ApiTags('catalog')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('buyers')
  buyers(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.catalog.listBuyers(identity.businessId, page);
  }

  @Post('buyers')
  @Roles(UserRole.Wholesaler)
  createBuyer(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateBuyerDto,
  ) {
    return this.catalog.createBuyer(identity, input);
  }

  @Patch('buyers/:id')
  @Roles(UserRole.Wholesaler)
  updateBuyer(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateBuyerDto,
  ) {
    return this.catalog.updateBuyer(identity, id, input);
  }

  @Delete('buyers/:id')
  @Roles(UserRole.Wholesaler)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateBuyer(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.deactivateBuyer(identity, id);
  }

  @Get('providers')
  providers(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.catalog.listProviders(identity.businessId, page);
  }

  @Post('providers')
  @Roles(UserRole.Wholesaler)
  createProvider(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateProviderDto,
  ) {
    return this.catalog.createProvider(identity, input);
  }

  @Patch('providers/:id')
  @Roles(UserRole.Wholesaler)
  updateProvider(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateProviderDto,
  ) {
    return this.catalog.updateProvider(identity, id, input);
  }

  @Delete('providers/:id')
  @Roles(UserRole.Wholesaler)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateProvider(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.deactivateProvider(identity, id);
  }

  @Get('varieties')
  varieties(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.catalog.listVarieties(identity.businessId, page);
  }

  @Post('varieties')
  @Roles(UserRole.Wholesaler)
  createVariety(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateVarietyDto,
  ) {
    return this.catalog.createVariety(identity, input);
  }

  @Patch('varieties/:id')
  @Roles(UserRole.Wholesaler)
  updateVariety(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateVarietyDto,
  ) {
    return this.catalog.updateVariety(identity, id, input);
  }

  @Delete('varieties/:id')
  @Roles(UserRole.Wholesaler)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateVariety(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.deactivateVariety(identity, id);
  }
}
