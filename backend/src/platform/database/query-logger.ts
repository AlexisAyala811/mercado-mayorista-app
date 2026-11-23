import { Logger as NestLogger } from '@nestjs/common';
import type { Logger } from 'typeorm';

// Development query log without bound parameters: they carry password hashes,
// tokens and personal data that must not reach the console or log files.
// A custom TypeORM logger decides by itself what to print, so it mirrors the
// built-in rules for a boolean `logging` option: queries and failures only when
// enabled; slow queries and migrations always; schema and info never.
export class ParameterlessQueryLogger implements Logger {
  private readonly logger = new NestLogger('TypeORM');

  constructor(private readonly enabled: boolean) {}

  logQuery(query: string, _parameters?: unknown) {
    if (this.enabled) this.logger.debug(`query: ${query}`);
  }

  logQueryError(error: string | Error, query: string, _parameters?: unknown) {
    if (!this.enabled) return;
    const message = error instanceof Error ? error.message : error;
    this.logger.error(`query failed: ${query} -- ${message}`);
  }

  logQuerySlow(time: number, query: string, _parameters?: unknown) {
    this.logger.warn(`slow query (${time} ms): ${query}`);
  }

  logSchemaBuild(_message: string) {}

  logMigration(message: string) {
    this.logger.log(message);
  }

  log(_level: 'log' | 'info' | 'warn', _message: unknown) {}
}
