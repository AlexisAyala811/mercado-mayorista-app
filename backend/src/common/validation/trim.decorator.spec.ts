import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateProviderDto } from '../../catalog/http/catalog.dto.js';
import { LoginDto } from '../../identity/http/login.dto.js';

describe('Trim', () => {
  it('normalizes text before length validation and rejects whitespace-only names', async () => {
    const input = plainToInstance(CreateProviderDto, {
      name: '   ',
      phone: ' 999  ',
    });

    const errors = await validate(input);

    expect(input.name).toBe('');
    expect(input.phone).toBe('999');
    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });

  it('trims the username without changing the password', async () => {
    const input = plainToInstance(LoginDto, {
      password: ' secret ',
      username: ' Mayorista ',
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    expect(input.username).toBe('Mayorista');
    expect(input.password).toBe(' secret ');
  });
});
