export type LoginInput = {
  password: string;
  username: string;
};

export type LoginValidationErrors = Partial<Record<keyof LoginInput, string>>;

export function validateLoginInput(input: LoginInput): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const usernameError = validateUsername(input.username);
  const passwordError = validatePassword(input.password);

  if (usernameError) errors.username = usernameError;
  if (passwordError) errors.password = passwordError;

  return errors;
}

export function validateUsername(username: string) {
  return username.trim() ? undefined : 'Ingresa tu usuario.';
}

export function validatePassword(password: string) {
  return password ? undefined : 'Ingresa tu contraseña.';
}

export function hasLoginValidationErrors(errors: LoginValidationErrors) {
  return Boolean(errors.username || errors.password);
}
