import type { Request } from 'express';

import type { SessionIdentity } from '../application/ports/session-identity-reader.js';

export type AuthenticatedRequest = Request & { identity: SessionIdentity };
