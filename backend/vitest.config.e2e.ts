import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Suites share one database and each runs the migrations; in parallel they race.
    fileParallelism: false,
    setupFiles: ['./test/database-setup.ts'],
  },
});
