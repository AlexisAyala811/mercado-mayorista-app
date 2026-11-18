import { defineConfig, devices } from '@playwright/test';

// Spec 015: end-to-end tests of the app exported to web, against a real API.
// Before running: export with EXPO_PUBLIC_API_URL pointing to that API and
// start the API with CORS_ORIGINS including http://127.0.0.1:8090. See e2e/README.md.
const port = Number(process.env.E2E_WEB_PORT ?? 8090);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'sesion', testMatch: /sesion.setup.ts/ },
    {
      name: 'tablet-chromium',
      dependencies: ['sesion'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, storageState: 'e2e-results/.sesion.json' },
    },
  ],
  webServer: {
    command: 'node e2e/serve-dist.mjs dist',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
