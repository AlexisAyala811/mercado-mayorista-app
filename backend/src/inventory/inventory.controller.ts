import {
  Controller,
  Get,
  GoneException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiGoneResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../identity/entities/user.entity.js';
import { Roles } from '../identity/http/roles.decorator.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { SessionAuthGuard } from '../identity/http/session-auth.guard.js';

const RETIRED_MESSAGE =
  'El control de existencias fue retirado. Consulta el historial de compras y ventas.';

// Keep historical URLs explicit; no retired endpoint reads or mutates stock.
// The contract marks them deprecated with their 410 answer (spec 021).
@Controller('inventory')
@ApiTags('inventory')
@ApiBearerAuth('session')
@ApiGoneResponse({ description: RETIRED_MESSAGE })
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Wholesaler, UserRole.Assistant)
export class InventoryController {
  @Get('lots') @ApiOperation({ deprecated: true }) lots() {
    return retired();
  }
  @Get('lots/:id') @ApiOperation({ deprecated: true }) lot() {
    return retired();
  }
  @Get('lots/:id/movements') @ApiOperation({ deprecated: true }) movements() {
    return retired();
  }
  @Post('lots/:id/adjustments')
  @ApiOperation({ deprecated: true })
  @Roles(UserRole.Wholesaler)
  adjust() {
    return retired();
  }
}
function retired(): never {
  throw new GoneException(RETIRED_MESSAGE);
}
