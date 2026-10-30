import Joi from 'joi';

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGINS: Joi.string().default('http://localhost:8081'),
  DATABASE_HOST: Joi.string().hostname().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().min(1).default('mercado'),
  DATABASE_PASSWORD: Joi.string().min(12).required(),
  DATABASE_NAME: Joi.string().min(1).default('mercado'),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(true),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).max(50).default(10),
  DATABASE_CONNECT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(5000),
  SESSION_TTL_MINUTES: Joi.number().integer().min(5).max(10080).required(),
  EVIDENCE_RETENTION_YEARS: Joi.number().integer().min(5).max(50).default(5),
  OPENAPI_ENABLED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .when('NODE_ENV', { is: 'production', then: Joi.boolean().default(false) })
    .default(true),
  // Express "trust proxy": false, true, a hop count or a comma-separated list
  // of addresses/subnets. Needed so login throttling sees each client's IP.
  TRUST_PROXY: Joi.string()
    .pattern(/^(false|true|\d{1,2}|[\w.:/,\s-]+)$/)
    .default('false'),
});

export function parseTrustProxy(value: string): boolean | number | string {
  const normalized = value.trim();
  if (normalized === 'false') return false;
  if (normalized === 'true') return true;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return normalized;
}
