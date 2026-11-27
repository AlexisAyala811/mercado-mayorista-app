import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
  Body,
} from '@nestjs/common';
import { minutes, Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ChangePasswordUseCase } from '../application/change-password.use-case.js';
import { CreateSessionUseCase } from '../application/create-session.use-case.js';
import type { SessionIdentity } from '../application/ports/session-identity-reader.js';
import { RevokeSessionUseCase } from '../application/revoke-session.use-case.js';
import { CurrentIdentity } from './current-identity.decorator.js';
import { ChangePasswordDto, LoginDto } from './login.dto.js';
import { AllowWhilePasswordChange } from './password-change.decorator.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('auth')
@ApiTags('identity')
export class IdentityController {
  constructor(
    private readonly createSession: CreateSessionUseCase,
    private readonly revokeSession: RevokeSessionUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
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
  @AllowWhilePasswordChange()
  current(@CurrentIdentity() identity: SessionIdentity) {
    return identity;
  }

  @Delete('session')
  @ApiBearerAuth('session')
  @UseGuards(SessionAuthGuard)
  @AllowWhilePasswordChange()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentIdentity() identity: SessionIdentity) {
    await this.revokeSession.execute(identity);
  }

  @Patch('password')
  @ApiBearerAuth('session')
  @UseGuards(SessionAuthGuard)
  @AllowWhilePasswordChange()
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentIdentity() identity: SessionIdentity,
    @Body() input: ChangePasswordDto,
  ) {
    await this.changePasswordUseCase.execute(
      identity,
      input.currentPassword,
      input.newPassword,
    );
  }
}
