import { expect, test } from '@playwright/test';

// Spec 015: the main paths of the app, end to end against a real API and a
// disposable database with the simulation data. Credentials come from the
// environment and are never written here.

test.describe('sin sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('rechaza una contraseña equivocada y no entra', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Usuario de terminal' }).fill(process.env.E2E_USERNAME ?? '');
    await page.getByRole('textbox', { name: 'Contraseña de acceso' }).fill('contraseña-equivocada-e2e');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Usuario o contraseña no válidos.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('una ruta protegida sin sesión vuelve al acceso', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });
});

test('el menú muestra Compra con sus módulos y datos del servidor', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('tab', { name: 'Compra' })).toBeVisible();
  for (const module of ['Anote', 'Ver compras', 'Carros', 'Deudas', 'Analítica', 'Reportes'])
    await expect(page.getByRole('button', { name: module, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deudas', exact: true })).toContainText('Por pagar S/');
  await page.getByRole('tab', { name: 'Venta' }).click();
  await expect(page.getByRole('button', { name: 'Ver ventas', exact: true })).toBeVisible();
});

test('Ver compras lista las compras con su estado de pago', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Ver compras', exact: true }).click();
  await expect(page).toHaveURL(/purchase-history/);
  // The previous screen stays mounted under the stack: only visible text counts.
  const visible = (text: string | RegExp) => page.getByText(text).filter({ visible: true }).first();
  await expect(visible('TOTAL COMPRAS')).toBeVisible();
  await expect(visible(/^\d+–\d+ de \d+ compras$/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ver detalle/i }).filter({ visible: true }).first()).toBeVisible();
});

test('Reportes de compras filtra por variedad y abre el detalle', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByText('Total inversión en compras')).toBeVisible();
  const filter = page.getByTestId('variety-filter');
  await expect(filter).toBeVisible();
  const varieties = filter.getByRole('radio');
  expect(await varieties.count()).toBeGreaterThan(1);
  const second = varieties.nth(1);
  const name = ((await second.getAttribute('aria-label')) ?? '').replace(/^Variedad /, '');
  await second.click();
  await expect(page.getByTestId('variety-footer')).toContainText('SUBTOTAL');
  await page.getByRole('button', { name: `Detalle de ${name}` }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).first().click();
});

test('Carros muestra los vehículos y filtra por tipo', async ({ page }) => {
  await page.goto('/logistics');
  await expect(page.getByRole('button', { name: /Registrar carro/ })).toBeVisible();
  const all = page.getByRole('radio', { name: /^Todos los Carros \(\d+\)$/ });
  await expect(all).toBeVisible();
  await page.getByRole('radio', { name: /^Con vehículo/ }).click();
  await expect(page.getByRole('button', { name: /^Ver registro de vehículo / }).first()).toBeVisible();
});
