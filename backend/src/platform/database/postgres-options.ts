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
  sslCa?: string;
  sslRejectUnauthorized: boolean;
  username: string;
};

// Spec 018: a hosted database (Supabase) signs its server certificate with its
// own CA. The PEM arrives in an environment variable; dashboards that keep a
// value on one line store the breaks as a literal "\n", so both forms work.
export function normalizePem(value: string | undefined) {
  const pem = value?.replace(/\\n/g, '\n').trim();
  return pem ? `${pem}\n` : undefined;
}

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
    ssl: input.ssl ? sslOptions(input) : false,
    synchronize: false,
  };
}

function sslOptions(input: PostgresOptionsInput) {
  const ca = normalizePem(input.sslCa);
  return ca
    ? { ca, rejectUnauthorized: input.sslRejectUnauthorized }
    : { rejectUnauthorized: input.sslRejectUnauthorized };
}
