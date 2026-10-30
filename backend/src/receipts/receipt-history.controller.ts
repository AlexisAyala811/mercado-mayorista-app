import {Controller,Get,Param,ParseEnumPipe,Query,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {PageQueryDto} from '../common/http/page-query.dto.js';
import type {SessionIdentity} from '../identity/application/ports/session-identity-reader.js';
import {UserRole} from '../identity/entities/user.entity.js';
import {CurrentIdentity} from '../identity/http/current-identity.decorator.js';
import {Roles} from '../identity/http/roles.decorator.js';
import {RolesGuard} from '../identity/http/roles.guard.js';
import {SessionAuthGuard} from '../identity/http/session-auth.guard.js';
import {ReceiptHistoryKind,ReceiptHistoryService} from './receipt-history.service.js';
@Controller('receipts/history')
@ApiTags('receipts')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard,RolesGuard)
@Roles(UserRole.Wholesaler)
export class ReceiptHistoryController {
  constructor(private readonly history:ReceiptHistoryService){}
  @Get(':kind')
  list(@CurrentIdentity() identity:SessionIdentity,@Param('kind',new ParseEnumPipe(ReceiptHistoryKind)) kind:ReceiptHistoryKind,@Query() page:PageQueryDto){return this.history.list(identity,kind,page);}
}
