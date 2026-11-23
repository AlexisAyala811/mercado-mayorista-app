import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('generates different salted hashes for the same password', async () => {
    const first = await hasher.hash('a-private-password');
    const second = await hasher.hash('a-private-password');

    expect(first).not.toBe(second);
    await expect(hasher.verify('a-private-password', first)).resolves.toBe(
      true,
    );
    await expect(hasher.verify('a-private-password', second)).resolves.toBe(
      true,
    );
  });

  it('rejects an incorrect password and malformed stored values', async () => {
    const stored = await hasher.hash('correct-password');

    await expect(hasher.verify('incorrect-password', stored)).resolves.toBe(
      false,
    );
    await expect(
      hasher.verify('correct-password', 'not-a-valid-hash'),
    ).resolves.toBe(false);
  });
});
