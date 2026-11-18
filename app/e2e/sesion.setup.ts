import { expect, test as setup } from '@playwright/test';

// Spec 015: one sign-in for the whole run. The API allows five sign-ins per
// minute, so each test reuses this session instead of signing in again.
export const sessionFile = 'e2e-results/.sesion.json';

setup('inicia sesión con el usuario de prueba', async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) throw new Error('Define E2E_USERNAME y E2E_PASSWORD.');
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Usuario de terminal' }).fill(username);
  await page.getByRole('textbox', { name: 'Contraseña de acceso' }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: /^Menú principal de MAÑAY/ })).toBeVisible();
  await page.context().storageState({ path: sessionFile });
});
