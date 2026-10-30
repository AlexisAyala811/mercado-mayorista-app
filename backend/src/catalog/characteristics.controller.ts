import {Body,Controller,Delete,Get,HttpCode,HttpStatus,Param,ParseUUIDPipe,Patch,Post,Query,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {PageQueryDto} from '../common/http/page-query.dto.js';
import type {SessionIdentity} from '../identity/application/ports/session-identity-reader.js';
import {UserRole} from '../identity/entities/user.entity.js';
import {CurrentIdentity} from '../identity/http/current-identity.decorator.js';
import {Roles} from '../identity/http/roles.decorator.js';
import {RolesGuard} from '../identity/http/roles.guard.js';
import {SessionAuthGuard} from '../identity/http/session-auth.guard.js';
import {CharacteristicsService} from './characteristics.service.js';
import {CreateVarietyDto} from './http/catalog.dto.js';

@Controller('catalog')
@ApiTags('catalog')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard,RolesGuard)
export class CharacteristicsController {
  constructor(private readonly characteristics:CharacteristicsService){}
  @Get('qualities')
  qualities(@CurrentIdentity() identity:SessionIdentity,@Query() page:PageQueryDto){return this.characteristics.list(identity.businessId,'quality',page);}
  @Get('origins')
  origins(@CurrentIdentity() identity:SessionIdentity,@Query() page:PageQueryDto){return this.characteristics.list(identity.businessId,'origin',page);}
  @Post('qualities') @Roles(UserRole.Wholesaler)
  createQuality(@CurrentIdentity() identity:SessionIdentity,@Body() input:CreateVarietyDto){return this.characteristics.save(identity,'quality',input.name);}
  @Post('origins') @Roles(UserRole.Wholesaler)
  createOrigin(@CurrentIdentity() identity:SessionIdentity,@Body() input:CreateVarietyDto){return this.characteristics.save(identity,'origin',input.name);}
  @Patch('qualities/:id') @Roles(UserRole.Wholesaler)
  updateQuality(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string,@Body() input:CreateVarietyDto){return this.characteristics.save(identity,'quality',input.name,id);}
  @Patch('origins/:id') @Roles(UserRole.Wholesaler)
  updateOrigin(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string,@Body() input:CreateVarietyDto){return this.characteristics.save(identity,'origin',input.name,id);}
  @Delete('qualities/:id') @Roles(UserRole.Wholesaler) @HttpCode(HttpStatus.NO_CONTENT)
  deactivateQuality(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string){return this.characteristics.deactivate(identity,'quality',id);}
  @Delete('origins/:id') @Roles(UserRole.Wholesaler) @HttpCode(HttpStatus.NO_CONTENT)
  deactivateOrigin(@CurrentIdentity() identity:SessionIdentity,@Param('id',ParseUUIDPipe) id:string){return this.characteristics.deactivate(identity,'origin',id);}
}
