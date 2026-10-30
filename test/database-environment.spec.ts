import { assertDatabaseTestEnvironment } from './database-environment.js';

describe('Database test prerequisites', () => {
  const valid = {
    RUN_DATABASE_E2E: 'true',
    NODE_ENV: 'test',
    DATABASE_NAME: 'mercado_test',
  };

  it('allows an explicitly enabled test database', () => {
    expect(() => assertDatabaseTestEnvironment(valid)).not.toThrow();
  });

  it.each([
    {},
    { ...valid, RUN_DATABASE_E2E: 'false' },
    { ...valid, NODE_ENV: 'production' },
    { ...valid, DATABASE_NAME: 'mercado' },
  ])(
    'fails before connecting when prerequisites are missing: %j',
    (environment) => {
      expect(() => assertDatabaseTestEnvironment(environment)).toThrow(
        'No database connection was attempted',
      );
    },
  );
});
