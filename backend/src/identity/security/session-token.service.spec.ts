import { SessionTokenService } from './session-token.service.js';

describe('SessionTokenService', () => {
  const service = new SessionTokenService();

  it('issues unique tokens and stores a deterministic hash representation', () => {
    const first = service.issue();
    const second = service.issue();

    expect(first.value).not.toBe(second.value);
    expect(first.hash).toHaveLength(64);
    expect(first.hash).toBe(service.hash(first.value));
    expect(first.hash).not.toContain(first.value);
  });
});
