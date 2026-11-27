import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, IsNull, Not } from 'typeorm';

import { AuditService } from '../../../shared/audit/audit.service.js';
import type { SessionIdentity } from './ports/session-identity-reader.js';
import { SessionEntity } from '../entities/session.entity.js';
import { UserEntity } from '../entities/user.entity.js';
import { PasswordHasher } from '../security/password-hasher.js';

// Spec 023: any user changes their own password. After a temporary password
// from the Administrator it is the only thing the session allows, so the
// Administrator never knows the final password.
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly passwordHasher: PasswordHasher,
    private readonly audit: AuditService,
  ) {}

  async execute(
    identity: SessionIdentity,
    currentPassword: string,
    newPassword: string,
  ) {
    if (currentPassword === newPassword)
      throw new UnprocessableEntityException(
        'La contraseña nueva debe ser distinta de la actual.',
      );
    const user = await this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: identity.userId })
      .andWhere('user.businessId = :businessId', {
        businessId: identity.businessId,
      })
      .getOne();
    if (
      !user ||
      !(await this.passwordHasher.verify(currentPassword, user.passwordHash))
    )
      // 422, not 401: the session is valid and the app must not sign out.
      throw new UnprocessableEntityException({
        code: 'current-password-incorrect',
        message: 'La contraseña actual no es correcta.',
      });

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(UserEntity)
        .update({ id: user.id }, { mustChangePassword: false, passwordHash });
      // Other devices must sign in again with the new password.
      await manager
        .getRepository(SessionEntity)
        .update(
          { id: Not(identity.sessionId), revokedAt: IsNull(), userId: user.id },
          { revokedAt: new Date() },
        );
      await this.audit.record(manager, {
        action: 'user.password-changed',
        actorUserId: user.id,
        businessId: identity.businessId,
        details: { required: user.mustChangePassword },
        resourceId: user.id,
        resourceType: 'user',
      });
    });
  }
}
