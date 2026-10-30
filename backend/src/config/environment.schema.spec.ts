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
