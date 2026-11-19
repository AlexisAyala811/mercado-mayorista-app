import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
    // Sprint 2: coverage of every source file, tested or not, so files with no
    // test count as 0 % instead of being left out of the report.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // The inventory service and its DTO are retired (CL-12, no inventory):
      // every route answers 410 and nothing calls them (T1707 removes them).
      exclude: [
        'src/**/*.spec.ts',
        'src/main.ts',
        'src/database/migrations/**',
        'src/inventory/inventory.service.ts',
        'src/inventory/http/adjust-inventory.dto.ts',
      ],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
