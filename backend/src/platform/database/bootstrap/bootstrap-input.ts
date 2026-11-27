export type BootstrapWholesalerInput = {
  businessName: string;
  password: string;
  username: string;
};

export function readBootstrapWholesalerInput(
  environment: NodeJS.ProcessEnv,
): BootstrapWholesalerInput {
  const businessName = environment.BOOTSTRAP_BUSINESS_NAME?.trim();
  const username = environment.BOOTSTRAP_USERNAME?.trim();
  const password = environment.BOOTSTRAP_PASSWORD;

  if (!businessName) throw new Error('BOOTSTRAP_BUSINESS_NAME is required.');
  if (!username) throw new Error('BOOTSTRAP_USERNAME is required.');
  if (!password || password.length < 12)
    throw new Error('BOOTSTRAP_PASSWORD must contain at least 12 characters.');
  if (businessName.length > 160)
    throw new Error('BOOTSTRAP_BUSINESS_NAME exceeds 160 characters.');
  if (username.length > 80)
    throw new Error('BOOTSTRAP_USERNAME exceeds 80 characters.');

  return { businessName, password, username };
}

// Spec 023: the Administrator lives in the single platform business. Its
// password is typed by the owner in their own terminal, never in a file.
export type BootstrapAdminInput = {
  password: string;
  username: string;
};

export function readBootstrapAdminInput(
  environment: NodeJS.ProcessEnv,
): BootstrapAdminInput {
  const username = environment.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = environment.BOOTSTRAP_ADMIN_PASSWORD;

  if (!username) throw new Error('BOOTSTRAP_ADMIN_USERNAME is required.');
  if (username.length > 80)
    throw new Error('BOOTSTRAP_ADMIN_USERNAME exceeds 80 characters.');
  if (!password || password.length < 12)
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.',
    );

  return { password, username };
}
