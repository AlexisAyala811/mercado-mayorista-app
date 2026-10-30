import {
  Controller,
  Get,
  GoneException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../identity/entities/user.entity.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';

// Keep historical URLs explicit; no retired endpoint reads or mutates stock.
@Controller('inventory')
@ApiTags('inventory')
@ApiBearerAuth('session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler, UserRole.Assistant)
export class InventoryController {
  @Get('lots') lots() {
    return retired();
  }
  @Get('lots/:id') lot() {
    return retired();
  }
  @Get('lots/:id/movements') movements() {
    return retired();
  }
  @Post('lots/:id/adjustments') @Roles(UserRole.Wholesaler) adjust() {
    return retired();
  }
}
function retired(): never {
  throw new GoneException(
    'El control de existencias fue retirado. Consulta el historial de compras y ventas.',
  );
}
