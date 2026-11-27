import {
  readBootstrapAdminInput,
  readBootstrapWholesalerInput,
} from './bootstrap-input.js';

describe('readBootstrapWholesalerInput', () => {
  it('requires a strong explicit initial credential', () => {
    expect(() => readBootstrapWholesalerInput({})).toThrow(
      'BOOTSTRAP_BUSINESS_NAME',
    );
    expect(() =>
      readBootstrapWholesalerInput({
        BOOTSTRAP_BUSINESS_NAME: 'Mercado',
        BOOTSTRAP_PASSWORD: 'short',
        BOOTSTRAP_USERNAME: 'mayorista',
      }),
    ).toThrow('at least 12 characters');
  });

  it('normalizes names without changing the password', () => {
    expect(
      readBootstrapWholesalerInput({
        BOOTSTRAP_BUSINESS_NAME: '  Mercado Central  ',
        BOOTSTRAP_PASSWORD: ' password with spaces ',
        BOOTSTRAP_USERNAME: '  Mayorista  ',
      }),
    ).toEqual({
      businessName: 'Mercado Central',
      password: ' password with spaces ',
      username: 'Mayorista',
    });
  });
});

describe('readBootstrapAdminInput', () => {
  it('requires a username and a strong password', () => {
    expect(() => readBootstrapAdminInput({})).toThrow(
      'BOOTSTRAP_ADMIN_USERNAME',
    );
    expect(() =>
      readBootstrapAdminInput({
        BOOTSTRAP_ADMIN_PASSWORD: 'short',
        BOOTSTRAP_ADMIN_USERNAME: 'soporte',
      }),
    ).toThrow('at least 12 characters');
  });

  it('trims the username and keeps the password as typed', () => {
    expect(
      readBootstrapAdminInput({
        BOOTSTRAP_ADMIN_PASSWORD: ' clave de soporte ',
        BOOTSTRAP_ADMIN_USERNAME: '  soporte  ',
      }),
    ).toEqual({ password: ' clave de soporte ', username: 'soporte' });
  });
});
