import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, type Repository } from 'typeorm';

import { AuditService } from '../../audit/audit.service.js';
import { toPage, type PageQueryDto } from '../../common/http/page-query.dto.js';
import type {
  CreateAssistantDto,
  ResetAssistantPasswordDto,
} from '../http/identity-administration.dto.js';
import type { SessionIdentity } from './ports/session-identity-reader.js';
import { SessionEntity } from '../entities/session.entity.js';
import { UserEntity, UserRole } from '../entities/user.entity.js';
import { PasswordHasher } from '../security/password-hasher.js';

@Injectable()
export class IdentityAdministrationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly passwordHasher: PasswordHasher,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async listAssistants(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.users.findAndCount({
      select: {
        businessId: true,
        createdAt: true,
        id: true,
        isActive: true,
        role: true,
        updatedAt: true,
        username: true,
      },
      where: { businessId, role: UserRole.Assistant },
      order: { username: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createAssistant(identity: SessionIdentity, input: CreateAssistantDto) {
    const passwordHash = await this.passwordHasher.hash(input.password);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(UserEntity);
        const user = await repository.save(
          repository.create({
            businessId: identity.businessId,
            isActive: true,
            passwordHash,
            role: UserRole.Assistant,
            username: input.username,
          }),
        );
        await this.audit.record(manager, {
          action: 'assistant.created',
          actorUserId: identity.userId,
          businessId: identity.businessId,
          resourceId: user.id,
          resourceType: 'user',
        });
        return publicUser(user);
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('El nombre de usuario ya está registrado.');
      throw error;
    }
  }

  async resetAssistantPassword(
    identity: SessionIdentity,
    id: string,
    input: ResetAssistantPasswordDto,
  ) {
    const passwordHash = await this.passwordHasher.hash(input.password);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserEntity);
      const user = await repository.findOne({
        where: {
          businessId: identity.businessId,
          id,
          role: UserRole.Assistant,
        },
      });
      if (!user) throw new NotFoundException('Encargado no encontrado.');
      if (!user.isActive)
        throw new UnprocessableEntityException(
          'El Encargado está desactivado.',
        );
      user.passwordHash = passwordHash;
      await repository.save(user);
      await manager
        .getRepository(SessionEntity)
        .update(
          { userId: user.id, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
      await this.audit.record(manager, {
        action: 'assistant.password-reset',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: user.id,
        resourceType: 'user',
      });
    });
  }

  async deactivateAssistant(identity: SessionIdentity, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserEntity);
      const result = await repository.update(
        {
          businessId: identity.businessId,
          id,
          isActive: true,
          role: UserRole.Assistant,
        },
        { isActive: false },
      );
      if (!result.affected)
        throw new NotFoundException('Encargado no encontrado.');
      await manager
        .getRepository(SessionEntity)
        .update({ userId: id, revokedAt: IsNull() }, { revokedAt: new Date() });
      await this.audit.record(manager, {
        action: 'assistant.deactivated',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: id,
        resourceType: 'user',
      });
    });
  }
}

function publicUser(user: UserEntity) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}
