import { environmentSchema, parseTrustProxy } from './environment.schema.js';

const base = {
  DATABASE_PASSWORD: 'a-long-test-password',
  SESSION_TTL_MINUTES: 60,
};

describe('environment schema', () => {
  it('disables OpenAPI by default in production only', () => {
    expect(
      environmentSchema.validate({ ...base, NODE_ENV: 'production' }).value
        .OPENAPI_ENABLED,
    ).toBe(false);
    expect(
      environmentSchema.validate({ ...base, NODE_ENV: 'development' }).value
        .OPENAPI_ENABLED,
    ).toBe(true);
  });

  it('keeps an explicit OpenAPI choice in production', () => {
    expect(
      environmentSchema.validate({
        ...base,
        NODE_ENV: 'production',
        OPENAPI_ENABLED: 'true',
      }).value.OPENAPI_ENABLED,
    ).toBe(true);
  });

  // Spec 012: the limit of requests per minute is configurable for load tests.
  it('keeps 100 requests per minute unless THROTTLE_LIMIT says otherwise', () => {
    expect(environmentSchema.validate(base).value.THROTTLE_LIMIT).toBe(100);
    expect(
      environmentSchema.validate({ ...base, THROTTLE_LIMIT: '100000' }).value
        .THROTTLE_LIMIT,
    ).toBe(100000);
    expect(
      environmentSchema.validate({ ...base, THROTTLE_LIMIT: '0' }).error,
    ).toBeDefined();
  });

  // Spec 013: the catalogs stay 60 seconds in memory; 0 turns the cache off.
  it('keeps the catalogs 60 seconds in memory unless configured', () => {
    expect(
      environmentSchema.validate(base).value.CATALOG_CACHE_TTL_SECONDS,
    ).toBe(60);
    expect(
      environmentSchema.validate({ ...base, CATALOG_CACHE_TTL_SECONDS: '0' })
        .value.CATALOG_CACHE_TTL_SECONDS,
    ).toBe(0);
    expect(
      environmentSchema.validate({ ...base, CATALOG_CACHE_TTL_SECONDS: '-1' })
        .error,
    ).toBeDefined();
  });

  it('does not trust proxies unless configured', () => {
    expect(environmentSchema.validate(base).value.TRUST_PROXY).toBe('false');
  });

  it.each([
    ['false', false],
    ['true', true],
    ['1', 1],
    ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
  ])('parses TRUST_PROXY=%s', (value, expected) => {
    expect(parseTrustProxy(value)).toEqual(expected);
  });
});
