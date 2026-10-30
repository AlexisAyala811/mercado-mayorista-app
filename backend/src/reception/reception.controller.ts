import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ReceptionsHistoryQueryDto } from './http/receptions-history-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CurrentIdentity } from '../identity/http/current-identity.decorator.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';
import { CreateReceptionDto } from './http/create-reception.dto.js';
import { ReceptionService } from './reception.service.js';
import {
  AddSackDto,
  CloseWeighingDto,
  CorrectClosedSackDto,
  CorrectSackDto,
  VoidSackDto,
} from './http/weighing.dto.js';
import { WeighingService } from './weighing.service.js';
import { VoidReceptionDto } from './http/void-reception.dto.js';

@Controller('receptions')
@ApiTags('receptions')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler, UserRole.Assistant)
export class ReceptionController {
  constructor(
    private readonly receptions: ReceptionService,
    private readonly weighing: WeighingService,
  ) {}

  @Get()
  list(
    @CurrentIdentity() identity: SessionIdentity,
    @Query() page: ReceptionsHistoryQueryDto,
  ) {
    return this.receptions.list(identity.businessId, page);
  }

  @Get(':id')
  get(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.receptions.get(identity.businessId, id);
  }

  @Post()
  create(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: CreateReceptionDto,
  ) {
    return this.receptions.create(identity, input);
  }

  @Post(':id/void')
  @Roles(UserRole.Wholesaler)
  void(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: VoidReceptionDto,
  ) {
    return this.receptions.void(identity, id, input);
  }

  @Get(':id/sacks')
  sacks(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.weighing.list(identity.businessId, id);
  }

  @Post(':id/sacks')
  addSack(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AddSackDto,
  ) {
    return this.weighing.add(identity, id, input);
  }

  @Patch(':id/sacks/:sackId')
  correctSack(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sackId', ParseUUIDPipe) sackId: string,
    @Body() input: CorrectSackDto,
  ) {
    return this.weighing.correct(identity, id, sackId, input);
  }

  @Post(':id/sacks/:sackId/void')
  voidSack(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sackId', ParseUUIDPipe) sackId: string,
    @Body() input: VoidSackDto,
  ) {
    return this.weighing.voidSack(identity, id, sackId, input);
  }

  @Post(':id/sacks/:sackId/correct-closed')
  @Roles(UserRole.Wholesaler)
  correctClosedSack(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sackId', ParseUUIDPipe) sackId: string,
    @Body() input: CorrectClosedSackDto,
  ) {
    return this.weighing.correctClosed(identity, id, sackId, input);
  }

  @Post(':id/close-weighing')
  closeWeighing(
    @CurrentIdentity() identity: SessionIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CloseWeighingDto,
  ) {
    return this.weighing.close(identity, id, input);
  }
}
