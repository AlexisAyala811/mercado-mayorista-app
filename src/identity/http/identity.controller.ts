import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
  Body,
} from '@nestjs/common';
import { minutes, Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateSessionUseCase } from '../application/create-session.use-case.js';
import type { SessionIdentity } from '../application/ports/session-identity-reader.js';
import { RevokeSessionUseCase } from '../application/revoke-session.use-case.js';
import { CurrentIdentity } from './current-identity.decorator.js';
import { LoginDto } from './login.dto.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('auth')
@ApiTags('identity')
export class IdentityController {
  constructor(
    private readonly createSession: CreateSessionUseCase,
    private readonly revokeSession: RevokeSessionUseCase,
  ) {}

  @Post('sessions')
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
  @HttpCode(HttpStatus.CREATED)
  async login(@Body() input: LoginDto) {
    const result = await this.createSession.execute(
      input.username,
      input.password,
    );
    if (!result) throw new UnauthorizedException('Credenciales no válidas.');

    return {
      accessToken: result.token,
      expiresAt: result.expiresAt,
      user: result.identity,
    };
  }

  @Get('session')
  @ApiBearerAuth('session')
  @UseGuards(SessionAuthGuard)
  current(@CurrentIdentity() identity: SessionIdentity) {
    return identity;
  }

  @Delete('session')
  @ApiBearerAuth('session')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentIdentity() identity: SessionIdentity) {
    await this.revokeSession.execute(identity);
  }
}
