import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessEntity } from './entities/business.entity.js';
import { SessionEntity } from './entities/session.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { DelegationEntity } from './entities/delegation.entity.js';
import { UserCredentialReader } from './application/ports/user-credential-reader.js';
import { SessionIdentityReader } from './application/ports/session-identity-reader.js';
import { CreateSessionUseCase } from './application/create-session.use-case.js';
import { RevokeSessionUseCase } from './application/revoke-session.use-case.js';
import { VerifyCredentialsUseCase } from './application/verify-credentials.use-case.js';
import { IdentityController } from './http/identity.controller.js';
import { IdentityAdministrationController } from './http/identity-administration.controller.js';
import { IdentityAdministrationService } from './application/identity-administration.service.js';
import { DelegationService } from './application/delegation.service.js';
import { SessionAuthGuard } from './http/session-auth.guard.js';
import { RolesGuard } from './http/roles.guard.js';
import { TypeOrmSessionIdentityReader } from './infrastructure/typeorm-session-identity.reader.js';
import { TypeOrmUserCredentialReader } from './infrastructure/typeorm-user-credential.reader.js';
import { PasswordHasher } from './security/password-hasher.js';
import { SessionTokenService } from './security/session-token.service.js';

@Module({
  controllers: [IdentityController, IdentityAdministrationController],
  exports: [
    SessionIdentityReader,
    PasswordHasher,
    RolesGuard,
    SessionTokenService,
    SessionAuthGuard,
    VerifyCredentialsUseCase,
  ],
  imports: [
    TypeOrmModule.forFeature([
      BusinessEntity,
      UserEntity,
      SessionEntity,
      DelegationEntity,
    ]),
  ],
  providers: [
    PasswordHasher,
    SessionTokenService,
    SessionAuthGuard,
    RolesGuard,
    CreateSessionUseCase,
    RevokeSessionUseCase,
    VerifyCredentialsUseCase,
    IdentityAdministrationService,
    DelegationService,
    TypeOrmUserCredentialReader,
    TypeOrmSessionIdentityReader,
    { provide: UserCredentialReader, useExisting: TypeOrmUserCredentialReader },
    {
      provide: SessionIdentityReader,
      useExisting: TypeOrmSessionIdentityReader,
    },
  ],
})
export class IdentityModule {}
