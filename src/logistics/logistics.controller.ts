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
import {
  CreateCarrierDto,
  CreateVehicleDto,
  UpdateCarrierDto,
  UpdateVehicleDto,
} from './http/logistics.dto.js';
import { LogisticsService } from './logistics.service.js';

@Controller('logistics')
@ApiTags('logistics')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
export class LogisticsController {
  constructor(private readonly logistics: LogisticsService) {}

  @Get('carriers')
  carriers(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.logistics.listCarriers(identity.businessId, page);
  }

  @Post('carriers')
  @Roles(UserRole.Wholesaler)
  createCarrier(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateCarrierDto,
  ) {
    return this.logistics.createCarrier(identity, input);
  }

  @Patch('carriers/:id')
  @Roles(UserRole.Wholesaler)
  updateCarrier(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCarrierDto,
  ) {
    return this.logistics.updateCarrier(identity, id, input);
  }

  @Delete('carriers/:id')
  @Roles(UserRole.Wholesaler)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateCarrier(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.logistics.deactivateCarrier(identity, id);
  }

  @Get('vehicles')
  vehicles(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: PageQueryDto,
  ) {
    return this.logistics.listVehicles(identity.businessId, page);
  }

  @Post('vehicles')
  @Roles(UserRole.Wholesaler)
  createVehicle(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateVehicleDto,
  ) {
    return this.logistics.createVehicle(identity, input);
  }

  @Patch('vehicles/:id')
  @Roles(UserRole.Wholesaler)
  updateVehicle(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateVehicleDto,
  ) {
    return this.logistics.updateVehicle(identity, id, input);
  }

  @Delete('vehicles/:id')
  @Roles(UserRole.Wholesaler)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateVehicle(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.logistics.deactivateVehicle(identity, id);
  }
}
