import { NotFoundException } from '@nestjs/common';
import type { EntityTarget } from 'typeorm';

import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import type { AuditService } from './audit.service.js';

/**
 * Runs a lookup scoped to the caller's business and, when it answers 404,
 * records the attempt if the id belongs to another business (AC04).
 */
export async function auditForeignAccess<T>(
  audit: AuditService,
  identity: SessionIdentity,
  target: EntityTarget<{ id: string }>,
  id: string,
  resourceType: string,
  lookup: () => Promise<T>,
): Promise<T> {
  try {
    return await lookup();
  } catch (error) {
    if (error instanceof NotFoundException)
      await audit
        .recordIfForeign(identity, target, id, resourceType)
        .catch(() => undefined);
    throw error;
  }
}
