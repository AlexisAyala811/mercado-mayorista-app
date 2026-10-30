import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

export type IssuedSessionToken = {
  hash: string;
  value: string;
};

@Injectable()
export class SessionTokenService {
  issue(): IssuedSessionToken {
    const value = randomBytes(32).toString('base64url');
    return { hash: this.hash(value), value };
  }

  hash(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}
