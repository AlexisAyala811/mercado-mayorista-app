import { Logger as NestLogger } from '@nestjs/common';

import { createPostgresOptions } from './postgres-options.js';
import { ParameterlessQueryLogger } from './query-logger.js';

const secret = 'scrypt$32768$8$1$salt$hash';
const sql = 'INSERT INTO "users"("password_hash") VALUES ($1)';

function capture() {
  const lines: string[] = [];
  for (const level of ['debug', 'error', 'warn', 'log'] as const)
    vi.spyOn(NestLogger.prototype, level).mockImplementation((message) => {
      lines.push(String(message));
    });
  return lines;
}

describe('ParameterlessQueryLogger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs the SQL of a query, a failure and a slow query without their parameters', () => {
    const lines = capture();
    const logger = new ParameterlessQueryLogger(true);

    logger.logQuery(sql, [secret]);
    logger.logQueryError(new Error('duplicate key'), sql, [secret]);
    logger.logQuerySlow(1500, sql, [secret]);

    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.includes(sql))).toBe(true);
    expect(lines.join('\n')).not.toContain(secret);
    expect(lines[1]).toContain('duplicate key');
  });

  it('stays quiet when logging is off, except slow queries and migrations', () => {
    const lines = capture();
    const logger = new ParameterlessQueryLogger(false);

    logger.logQuery(sql, [secret]);
    logger.logQueryError('boom', sql, [secret]);
    logger.logSchemaBuild('schema');
    logger.log('info', 'info');
    logger.logQuerySlow(1500, sql, [secret]);
    logger.logMigration('migration applied');

    expect(lines).toEqual([
      `slow query (1500 ms): ${sql}`,
      'migration applied',
    ]);
  });

  it('is the logger of every PostgreSQL connection', () => {
    const options = createPostgresOptions({
      connectTimeoutMs: 5000,
      database: 'mercado',
      host: 'localhost',
      logging: true,
      password: 'private-password',
      poolSize: 10,
      port: 5432,
      ssl: false,
      sslRejectUnauthorized: true,
      username: 'mercado',
    });
    expect(options.logger).toBeInstanceOf(ParameterlessQueryLogger);
  });
});
