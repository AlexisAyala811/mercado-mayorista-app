import { createPostgresOptions } from './postgres-options.js';

describe('createPostgresOptions', () => {
  const base = {
    connectTimeoutMs: 5000,
    database: 'mercado',
    host: 'postgres',
    logging: false,
    password: 'private-password',
    poolSize: 10,
    port: 5432,
    ssl: false,
    sslRejectUnauthorized: true,
    username: 'mercado',
  };

  it('disables TLS explicitly for a trusted local network', () => {
    expect(createPostgresOptions(base)).toEqual(
      expect.objectContaining({ poolSize: 10, ssl: false }),
    );
  });

  it('requires certificate validation when production TLS is enabled', () => {
    expect(createPostgresOptions({ ...base, ssl: true })).toEqual(
      expect.objectContaining({ ssl: { rejectUnauthorized: true } }),
    );
  });
});
