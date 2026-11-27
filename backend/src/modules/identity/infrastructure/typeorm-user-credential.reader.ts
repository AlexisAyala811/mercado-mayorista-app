import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import {
  UserCredentialReader,
  type StoredUserCredential,
} from '../application/ports/user-credential-reader.js';
import { UserEntity } from '../entities/user.entity.js';

@Injectable()
export class TypeOrmUserCredentialReader extends UserCredentialReader {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {
    super();
  }

  async findActiveByUsername(
    username: string,
  ): Promise<StoredUserCredential | undefined> {
    // Spec 023: a suspended business cannot sign in, whatever the role.
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .innerJoin('user.business', 'business', 'business.isActive = true')
      .where('lower(user.username) = lower(:username)', { username })
      .andWhere('user.isActive = true')
      .getOne();

    if (!user) return undefined;

    return {
      businessId: user.businessId,
      id: user.id,
      mustChangePassword: user.mustChangePassword,
      passwordHash: user.passwordHash,
      role: user.role,
      username: user.username,
    };
  }

  async recordFailedLogin(userId: string): Promise<void> {
    await this.users
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        failedLoginAttempts: () => '"failed_login_attempts" + 1',
        lastFailedLoginAt: () => 'now()',
      })
      .where('id = :userId', { userId })
      .execute();
  }
}
