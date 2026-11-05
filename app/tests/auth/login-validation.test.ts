import { hasLoginValidationErrors, validateLoginInput } from '@/features/auth/validation/login-validation';

describe('validateLoginInput', () => {
  it('requires both credentials without exposing account rules', () => {
    expect(validateLoginInput({ password: '', username: '   ' })).toEqual({
      password: 'Ingresa tu contraseña.',
      username: 'Ingresa tu usuario.',
    });
  });

  it('accepts a complete input and trims are handled by the caller', () => {
    const errors = validateLoginInput({ password: 'private-value', username: 'usuario' });

    expect(errors).toEqual({});
    expect(hasLoginValidationErrors(errors)).toBe(false);
  });
});
