import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '../entities/user.entity.js';

export const rolesMetadataKey = 'allowed-roles';
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(rolesMetadataKey, roles);
