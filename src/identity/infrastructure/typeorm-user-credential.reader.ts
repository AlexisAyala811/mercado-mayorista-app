import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import {
  UserCredentialReader,
  type StoredUserCredential,
} from '../application/ports/user-credential-reader.js';
import { UserEntity } from '../entities/user.entity.js';

@Injectable()
export class TypeOrmUserCredentialReader implements UserCredentialReader {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async findActiveByUsername(
    username: string,
  ): Promise<StoredUserCredential | undefined> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('lower(user.username) = lower(:username)', { username })
      .andWhere('user.isActive = true')
      .getOne();

    if (!user) return undefined;

    return {
      businessId: user.businessId,
      id: user.id,
      passwordHash: user.passwordHash,
      role: user.role,
      username: user.username,
    };
  }
}
