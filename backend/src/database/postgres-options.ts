import { ParameterlessQueryLogger } from './query-logger.js';

export type PostgresOptionsInput = {
  connectTimeoutMs: number;
  database: string;
  host: string;
  logging: boolean;
  password: string;
  poolSize: number;
  port: number;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  username: string;
};

export function createPostgresOptions(input: PostgresOptionsInput) {
  return {
    type: 'postgres' as const,
    host: input.host,
    port: input.port,
    username: input.username,
    password: input.password,
    database: input.database,
    connectTimeoutMS: input.connectTimeoutMs,
    logging: input.logging,
    logger: new ParameterlessQueryLogger(input.logging),
    maxQueryExecutionTime: 1000,
    poolSize: input.poolSize,
    ssl: input.ssl
      ? { rejectUnauthorized: input.sslRejectUnauthorized }
      : false,
    synchronize: false,
  };
}
