import { ConflictException } from '@nestjs/common';

import { requireSameOperation, sameMembers } from './operation-replay.js';

describe('operation replay', () => {
  it('accepts a retry that matches the recorded operation', () => {
    expect(() => requireSameOperation(true)).not.toThrow();
  });

  it('rejects a reused identifier with an explicit conflict code', () => {
    try {
      requireSameOperation(false);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'operation-id-conflict',
      });
    }
  });

  it('compares members independently of order', () => {
    expect(sameMembers(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameMembers(['a', 'b'], ['a'])).toBe(false);
    expect(sameMembers(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(sameMembers(['a', 'a'], ['a', 'b'])).toBe(false);
    expect(sameMembers(['a', 'b'], ['a', 'a'])).toBe(false);
  });
});
